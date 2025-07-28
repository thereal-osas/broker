"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Image from "next/image";
import { motion } from "framer-motion";
import {
  FileText,
  Plus,
  Edit,
  Trash2,
  Send,
  Eye,
  Calendar,
  User,
  X,
} from "lucide-react";
import { useToast } from "../../../hooks/useToast";

interface Newsletter {
  id: string;
  title: string;
  content: string;
  image_url?: string;
  author_id: string;
  author_name: string;
  is_published: boolean;
  published_at: string | null;
  created_at: string;
  updated_at: string;
}

export default function AdminNewsletterPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [newsletters, setNewsletters] = useState<Newsletter[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingNewsletter, setEditingNewsletter] = useState<Newsletter | null>(
    null
  );
  const [formData, setFormData] = useState({
    title: "",
    content: "",
    image_url: "",
    is_published: false,
  });
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>("");
  const toast = useToast();

  useEffect(() => {
    if (status === "loading") return;

    if (!session?.user || session.user.role !== "admin") {
      router.push("/auth/signin");
      return;
    }

    fetchNewsletters();
  }, [session, status, router]);

  const fetchNewsletters = async () => {
    try {
      const response = await fetch("/api/admin/newsletters");
      if (response.ok) {
        const data = await response.json();
        setNewsletters(data);
      }
    } catch (error) {
      console.error("Error fetching newsletters:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      let imageUrl = formData.image_url;

      // Upload image if a new file is selected
      if (imageFile) {
        imageUrl = await uploadImage(imageFile);
      }

      const url = editingNewsletter
        ? `/api/admin/newsletters/${editingNewsletter.id}`
        : "/api/admin/newsletters";

      const method = editingNewsletter ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...formData,
          image_url: imageUrl,
        }),
      });

      if (response.ok) {
        fetchNewsletters();
        resetForm();
        toast.success(
          editingNewsletter
            ? "Newsletter updated successfully!"
            : "Newsletter created successfully!"
        );
      } else {
        const error = await response.json();
        toast.error(error.error || "Failed to save newsletter");
      }
    } catch (error) {
      console.error("Error saving newsletter:", error);
      toast.error("An error occurred while saving the newsletter");
    } finally {
      setIsLoading(false);
    }
  };

  const handleEdit = (newsletter: Newsletter) => {
    setEditingNewsletter(newsletter);
    setFormData({
      title: newsletter.title,
      content: newsletter.content,
      image_url: newsletter.image_url || "",
      is_published: newsletter.is_published,
    });
    setImagePreview(newsletter.image_url || "");
    setShowForm(true);
  };

  const handleDelete = async (newsletterId: string) => {
    if (!confirm("Are you sure you want to delete this newsletter?")) return;

    try {
      const response = await fetch(`/api/admin/newsletters/${newsletterId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        fetchNewsletters();
        alert("Newsletter deleted successfully!");
      } else {
        const errorData = await response.json();
        alert(errorData.error || "Failed to delete newsletter");
      }
    } catch {
      alert("An error occurred while deleting the newsletter");
    }
  };

  const togglePublishStatus = async (
    newsletterId: string,
    currentStatus: boolean
  ) => {
    try {
      const response = await fetch(`/api/admin/newsletters/${newsletterId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          is_published: !currentStatus,
        }),
      });

      if (response.ok) {
        fetchNewsletters();
        alert(
          `Newsletter ${
            !currentStatus ? "published" : "unpublished"
          } successfully!`
        );
      }
    } catch {
      alert("An error occurred while updating the newsletter status");
    }
  };

  const resetForm = () => {
    setFormData({
      title: "",
      content: "",
      image_url: "",
      is_published: false,
    });
    setImageFile(null);
    setImagePreview("");
    setEditingNewsletter(null);
    setShowForm(false);
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value, type } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]:
        type === "checkbox" ? (e.target as HTMLInputElement).checked : value,
    }));
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onload = (e) => {
        setImagePreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const uploadImage = async (file: File): Promise<string> => {
    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(errorData.error || `Upload failed with status ${response.status}`);
      }

      const data = await response.json();
      return data.url;
    } catch (error) {
      console.error('Image upload error:', error);
      throw error;
    }
  };

  if (status === "loading" || isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                Newsletter Management
              </h1>
              <p className="text-gray-600">
                Create and manage platform newsletters
              </p>
            </div>
            <button
              onClick={() => setShowForm(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center"
            >
              <Plus className="w-4 h-4 mr-2" />
              Create Newsletter
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Newsletter Form Modal */}
        {showForm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          >
            <motion.div
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
            >
              <div className="p-6">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-xl font-semibold text-gray-900">
                    {editingNewsletter
                      ? "Edit Newsletter"
                      : "Create Newsletter"}
                  </h2>
                  <button
                    onClick={resetForm}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Title
                    </label>
                    <input
                      type="text"
                      name="title"
                      value={formData.title}
                      onChange={handleChange}
                      required
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 form-input"
                      placeholder="Enter newsletter title"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Content
                    </label>
                    <textarea
                      name="content"
                      value={formData.content}
                      onChange={handleChange}
                      required
                      rows={10}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 form-input"
                      placeholder="Enter newsletter content..."
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Newsletter Image
                    </label>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageChange}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    {imagePreview && (
                      <div className="mt-2">
                        {imagePreview.startsWith('data:') ? (
                          <img
                            src={imagePreview}
                            alt="Newsletter preview"
                            className="max-w-xs h-32 object-cover rounded-lg"
                          />
                        ) : (
                          <Image
                            src={imagePreview}
                            alt="Newsletter preview"
                            width={300}
                            height={128}
                            className="max-w-xs h-32 object-cover rounded-lg"
                          />
                        )}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      name="is_published"
                      checked={formData.is_published}
                      onChange={handleChange}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <label className="ml-2 block text-sm text-gray-900">
                      Publish immediately
                    </label>
                  </div>

                  <div className="flex justify-end space-x-4">
                    <button
                      type="button"
                      onClick={resetForm}
                      className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isLoading}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                    >
                      {isLoading
                        ? "Saving..."
                        : editingNewsletter
                        ? "Update"
                        : "Create"}
                    </button>
                  </div>
                </form>
              </div>
            </motion.div>
          </motion.div>
        )}

        {/* Newsletters List */}
        <div className="space-y-6">
          {newsletters.map((newsletter, index) => (
            <motion.div
              key={newsletter.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="bg-white rounded-xl shadow-lg overflow-hidden"
            >
              <div
                className={`h-2 ${
                  newsletter.is_published ? "bg-green-500" : "bg-gray-400"
                }`}
              ></div>
              <div className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex-1">
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">
                      {newsletter.title}
                    </h3>
                    <div className="flex items-center space-x-4 text-sm text-gray-500">
                      <div className="flex items-center">
                        <User className="w-4 h-4 mr-1" />
                        {newsletter.author_name}
                      </div>
                      <div className="flex items-center">
                        <Calendar className="w-4 h-4 mr-1" />
                        {new Date(newsletter.created_at).toLocaleDateString()}
                      </div>
                      <span
                        className={`px-2 py-1 rounded-full text-xs ${
                          newsletter.is_published
                            ? "bg-green-100 text-green-800"
                            : "bg-gray-100 text-gray-800"
                        }`}
                      >
                        {newsletter.is_published ? "Published" : "Draft"}
                      </span>
                    </div>
                  </div>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => handleEdit(newsletter)}
                      className="p-2 text-blue-600 hover:bg-blue-50 rounded"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() =>
                        togglePublishStatus(
                          newsletter.id,
                          newsletter.is_published
                        )
                      }
                      className="p-2 text-green-600 hover:bg-green-50 rounded"
                    >
                      {newsletter.is_published ? (
                        <Eye className="w-4 h-4" />
                      ) : (
                        <Send className="w-4 h-4" />
                      )}
                    </button>
                    <button
                      onClick={() => handleDelete(newsletter.id)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="text-gray-600 line-clamp-3">
                  {newsletter.content.substring(0, 200)}
                  {newsletter.content.length > 200 && "..."}
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {newsletters.length === 0 && (
          <div className="text-center py-12">
            <FileText className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">
              No newsletters
            </h3>
            <p className="mt-1 text-sm text-gray-500">
              Get started by creating your first newsletter.
            </p>
            <div className="mt-6">
              <button
                onClick={() => setShowForm(true)}
                className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
              >
                <Plus className="w-4 h-4 mr-2" />
                Create Newsletter
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
