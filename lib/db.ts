import { Pool, PoolClient, QueryResult } from "pg";

// Database configuration
const dbConfig = {
  user: process.env.DB_USER || "postgres",
  host: process.env.DB_HOST || "localhost",
  database: process.env.DB_NAME || "broker_platform",
  password: process.env.DB_PASSWORD || "YOUR_ACTUAL_PASSWORD_HERE",
  // Uncomment the line below if using Windows authentication
  // ssl: false,
  port: parseInt(process.env.DB_PORT || "5432"),
  max: 20, // Maximum number of clients in the pool
  idleTimeoutMillis: 30000, // Close idle clients after 30 seconds
  connectionTimeoutMillis: 10000, // Return an error after 10 seconds if connection could not be established
  acquireTimeoutMillis: 10000, // Return an error after 10 seconds if a client cannot be acquired
  statement_timeout: 30000, // Cancel any statement that takes more than 30 seconds
  query_timeout: 30000, // Cancel any query that takes more than 30 seconds
};

// Create a connection pool
const pool = new Pool(dbConfig);

// Handle pool errors
pool.on("error", (err) => {
  console.error("Unexpected error on idle client", err);
  process.exit(-1);
});

// Database connection wrapper
export class Database {
  private static instance: Database;
  private pool: Pool;

  private constructor() {
    this.pool = pool;
  }

  public static getInstance(): Database {
    if (!Database.instance) {
      Database.instance = new Database();
    }
    return Database.instance;
  }

  // Execute a query with retry logic
  async query(text: string, params?: unknown[], retries: number = 3): Promise<QueryResult> {
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        const client = await this.pool.connect();
        try {
          const result = await client.query(text, params);
          return result;
        } finally {
          client.release();
        }
      } catch (error: unknown) {
        const errorObj = error instanceof Error ? error : new Error(String(error));
        lastError = errorObj;
        console.error(
          `Database query error (attempt ${attempt}/${retries}):`,
          errorObj.message
        );

        // Don't retry for certain types of errors
        if (
          (errorObj as { code?: string }).code === "23505" ||
          (errorObj as { code?: string }).code === "23503" ||
          (errorObj as { code?: string }).code === "42P01"
        ) {
          // Unique violation, foreign key violation, or table doesn't exist
          throw errorObj;
        }

        // Wait before retrying (exponential backoff)
        if (attempt < retries) {
          const delay = Math.min(1000 * Math.pow(2, attempt - 1), 5000);
          console.log(`Retrying in ${delay}ms...`);
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      }
    }

    throw lastError || new Error('Database query failed');
  }

  // Execute a transaction
  async transaction<T>(
    callback: (client: PoolClient) => Promise<T>
  ): Promise<T> {
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      const result = await callback(client);
      await client.query("COMMIT");
      return result;
    } catch (error) {
      await client.query("ROLLBACK");
      console.error("Transaction error:", error);
      throw error;
    } finally {
      client.release();
    }
  }

  // Get a client for manual transaction management
  async getClient(): Promise<PoolClient> {
    return await this.pool.connect();
  }

  // Close all connections
  async close(): Promise<void> {
    await this.pool.end();
  }
}

// Export the database instance
export const db = Database.getInstance();

// Helper functions for common database operations

// User operations
export const userQueries = {
  // Create a new user
  async createUser(userData: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    phone?: string;
    role?: string;
    referralCode?: string;
    referredBy?: string;
  }) {
    const query = `
      INSERT INTO users (email, password, first_name, last_name, phone, role, referral_code, referred_by)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `;
    const values = [
      userData.email,
      userData.password,
      userData.firstName,
      userData.lastName,
      userData.phone || null,
      userData.role || "investor",
      userData.referralCode || null,
      userData.referredBy || null,
    ];
    const result = await db.query(query, values);
    return result.rows[0];
  },

  // Find user by email
  async findByEmail(email: string) {
    const query = "SELECT * FROM users WHERE email = $1";
    const result = await db.query(query, [email]);
    return result.rows[0];
  },

  // Find user by ID
  async findById(id: string) {
    const query = "SELECT * FROM users WHERE id = $1";
    const result = await db.query(query, [id]);
    return result.rows[0];
  },

  // Find user by referral code
  async findByReferralCode(referralCode: string) {
    const query = "SELECT * FROM users WHERE referral_code = $1";
    const result = await db.query(query, [referralCode]);
    return result.rows[0];
  },

  // Update user
  async updateUser(id: string, updates: Record<string, unknown>) {
    const setClause = Object.keys(updates)
      .map((key, index) => `${key} = $${index + 2}`)
      .join(", ");
    const query = `UPDATE users SET ${setClause} WHERE id = $1 RETURNING *`;
    const values = [id, ...Object.values(updates)];
    const result = await db.query(query, values);
    return result.rows[0];
  },
};

// Balance operations
export const balanceQueries = {
  // Create initial balance for user
  async createUserBalance(userId: string) {
    const query = `
      INSERT INTO user_balances (user_id)
      VALUES ($1)
      RETURNING *
    `;
    const result = await db.query(query, [userId]);
    return result.rows[0];
  },

  // Get user balance
  async getUserBalance(userId: string) {
    const query = "SELECT * FROM user_balances WHERE user_id = $1";
    const result = await db.query(query, [userId]);
    return result.rows[0];
  },

  // Update specific balance type
  async updateBalance(
    userId: string,
    balanceType: string,
    amount: number,
    operation: "add" | "subtract" = "add"
  ) {
    const operator = operation === "add" ? "+" : "-";
    const query = `
      UPDATE user_balances 
      SET ${balanceType} = ${balanceType} ${operator} $2
      WHERE user_id = $1
      RETURNING *
    `;
    const result = await db.query(query, [userId, Math.abs(amount)]);
    return result.rows[0];
  },
};

// Investment operations
export const investmentQueries = {
  // Get all active investment plans
  async getActivePlans() {
    const query =
      "SELECT * FROM investment_plans WHERE is_active = true ORDER BY min_amount ASC";
    const result = await db.query(query);
    return result.rows.map((plan: Record<string, unknown>) => ({
      ...plan,
      min_amount: parseFloat(String(plan.min_amount || 0)),
      max_amount: plan.max_amount ? parseFloat(String(plan.max_amount)) : null,
      daily_profit_rate: parseFloat(String(plan.daily_profit_rate || 0)),
      duration_days: parseInt(String(plan.duration_days || 0)),
    }));
  },

  // Create user investment
  async createInvestment(investmentData: {
    userId: string;
    planId: string;
    amount: number;
  }) {
    const query = `
      INSERT INTO user_investments (user_id, plan_id, amount)
      VALUES ($1, $2, $3)
      RETURNING *
    `;
    const values = [
      investmentData.userId,
      investmentData.planId,
      investmentData.amount,
    ];
    const result = await db.query(query, values);
    return result.rows[0];
  },

  // Get user investments
  async getUserInvestments(userId: string) {
    const query = `
      SELECT ui.*, ip.name as plan_name, ip.daily_profit_rate, ip.duration_days
      FROM user_investments ui
      JOIN investment_plans ip ON ui.plan_id = ip.id
      WHERE ui.user_id = $1
      ORDER BY ui.created_at DESC
    `;
    const result = await db.query(query, [userId]);
    return result.rows.map((investment: Record<string, unknown>) => ({
      ...investment,
      amount: parseFloat(String(investment.amount || 0)),
      total_profit: parseFloat(String(investment.total_profit || 0)),
      daily_profit_rate: parseFloat(String(investment.daily_profit_rate || 0)),
      duration_days: parseInt(String(investment.duration_days || 0)),
    }));
  },
};

// Transaction operations
export const transactionQueries = {
  // Create transaction
  async createTransaction(transactionData: {
    userId: string;
    type: string;
    amount: number;
    balanceType: string;
    description?: string;
    referenceId?: string;
    status?: string;
  }) {
    const query = `
      INSERT INTO transactions (user_id, type, amount, balance_type, description, reference_id, status)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `;
    const values = [
      transactionData.userId,
      transactionData.type,
      transactionData.amount,
      transactionData.balanceType,
      transactionData.description || null,
      transactionData.referenceId || null,
      transactionData.status || "completed",
    ];
    const result = await db.query(query, values);
    return result.rows[0];
  },

  // Get user transactions
  async getUserTransactions(userId: string, limit: number = 50) {
    const query = `
      SELECT * FROM transactions
      WHERE user_id = $1
      ORDER BY created_at DESC
      LIMIT $2
    `;
    const result = await db.query(query, [userId, limit]);
    return result.rows.map((transaction: Record<string, unknown>) => ({
      ...transaction,
      amount: parseFloat(String(transaction.amount || 0)),
    }));
  },
};

export default db;
