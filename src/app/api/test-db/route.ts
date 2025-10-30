import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
  try {
    // Test database connection and get environment info
    const result = await db.query(
      "SELECT NOW() as current_time, version() as pg_version"
    );

    const connectionInfo = {
      success: true,
      timestamp: result.rows[0].current_time,
      postgresql_version: result.rows[0].pg_version,
      database_url: process.env.DATABASE_URL ? "SET" : "NOT SET",
      database_host: process.env.DATABASE_URL
        ? process.env.DATABASE_URL.includes("localhost")
          ? "localhost"
          : process.env.DATABASE_URL.includes("railway")
            ? "railway"
            : "other"
        : "unknown",
      node_env: process.env.NODE_ENV,
      nextauth_url: process.env.NEXTAUTH_URL,
    };

    return NextResponse.json(connectionInfo);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
        database_url: process.env.DATABASE_URL ? "SET" : "NOT SET",
        database_host: process.env.DATABASE_URL
          ? process.env.DATABASE_URL.includes("localhost")
            ? "localhost"
            : process.env.DATABASE_URL.includes("railway")
              ? "railway"
              : "other"
          : "unknown",
      },
      { status: 500 }
    );
  }
}
