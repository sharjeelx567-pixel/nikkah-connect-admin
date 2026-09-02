"use client";

import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import api from "../../../services/api";
import { LegalDocument, LegalDocumentVersion } from "../../../types";
import {
  FileText, Plus, Edit3, Trash2, X, History, Eye, Send, Save, Globe, Search, BookOpen, Scale, RotateCcw, Archive, ArchiveRestore
} from "lucide-react";

export default function ContentPage() {
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<"all" | "published" | "draft" | "unpublished" | "archived">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [editingDoc, setEditingDoc] = useState<Partial<LegalDocument> | null>(null);
  const [isNewDoc, setIsNewDoc] = useState(false);
  const [changeLog, setChangeLog] = useState("");
  const [previewMode, setPreviewMode] = useState<"edit" | "preview" | "split">("split");
  const [historySlug, setHistorySlug] = useState<string | null>(null);

  const { data: legalDocsData, isLoading: docsLoading } = useQuery<{ data: LegalDocument[] }>({
    queryKey: ["admin-legal-documents"],
    queryFn: () => api.get("/content").then((r) => r.data),
    refetchInterval: 20000,
  });
  const legalDocs = legalDocsData?.data || [];

  const { data: versionsData, isLoading: versionsLoading } = useQuery<{ data: LegalDocumentVersion[] }>({
    queryKey: ["document-versions", historySlug],
    queryFn: () => api.get(`/content/${historySlug}/versions`).then((r) => r.data),
    enabled: !!historySlug,
  });
  const versions = versionsData?.data || [];

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["admin-legal-documents"] });
    if (historySlug) queryClient.invalidateQueries({ queryKey: ["document-versions", historySlug] });
  };

  const createMutation = useMutation({
    mutationFn: (payload: any) => api.post("/content", payload),
    onSuccess: () => { invalidate(); setEditingDoc(null); setIsNewDoc(false); },
  });

  const updateDraftMutation = useMutation({
    mutationFn: ({ slug, ...payload }: any) => api.put(`/content/${slug}`, payload),
    onSuccess: () => { invalidate(); setEditingDoc(null); },
  });

  const publishMutation = useMutation({
    mutationFn: ({ slug, changeLog }: { slug: string; changeLog?: string }) =>
      api.patch(`/content/${slug}/publish`, { changeLog }),
    onSuccess: () => { invalidate(); setEditingDoc(null); },
  });

  const unpublishMutation = useMutation({
    mutationFn: (slug: string) => api.patch(`/content/${slug}/unpublish`),
    onSuccess: invalidate,
  });

  const archiveMutation = useMutation({
    mutationFn: (slug: string) => api.patch(`/content/${slug}/archive`),
    onSuccess: invalidate,
  });

  const restoreMutation = useMutation({
    mutationFn: (slug: string) => api.patch(`/content/${slug}/restore`),
    onSuccess: invalidate,
  });

  const deleteMutation = useMutation({
    mutationFn: (slug: string) => api.delete(`/content/${slug}`),
    onSuccess: invalidate,
  });

  const filteredDocs = legalDocs.filter((doc) => {
    const matchesStatus = statusFilter === "all" || doc.status === statusFilter;
    const matchesSearch =
      doc.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.slug.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (doc.summary || "").toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  const publishedCount = legalDocs.filter((d) => d.status === "published").length;
  const draftCount = legalDocs.filter((d) => d.status === "draft").length;
  const archivedCount = legalDocs.filter((d) => d.status === "archived").length;

  const handleOpenEditor = (doc: LegalDocument) => {
    setEditingDoc({ ...doc });
    setIsNewDoc(false);
    setChangeLog("");
    setPreviewMode("split");
  };

  const handleCreateNew = () => {
    setEditingDoc({
      title: "",
      slug: "",
      summary: "",
      content: "# New Legal Document\n\nWrite your content in Markdown...",
      status: "draft",
    });
    setIsNewDoc(true);
    setChangeLog("Initial draft");
    setPreviewMode("split");
  };

  const handleSaveDraft = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingDoc?.title || !editingDoc?.slug || !editingDoc?.content) return;

    if (isNewDoc) {
      createMutation.mutate({
        title: editingDoc.title,
        slug: editingDoc.slug,
        summary: editingDoc.summary,
        content: editingDoc.content,
        status: "draft",
      });
    } else {
      updateDraftMutation.mutate({
        slug: editingDoc.slug!,
        title: editingDoc.title,
        summary: editingDoc.summary,
        content: editingDoc.content,
        changeLog: changeLog || "Updated draft",
      });
    }
  };

  const handlePublishFromEditor = () => {
    if (!editingDoc?.title || !editingDoc?.slug || !editingDoc?.content) return;

    if (isNewDoc) {
      createMutation.mutate({
        title: editingDoc.title,
        slug: editingDoc.slug,
        summary: editingDoc.summary,
        content: editingDoc.content,
        status: "published",
      });
    } else {
      updateDraftMutation.mutate(
        {
          slug: editingDoc.slug!,
          title: editingDoc.title,
          summary: editingDoc.summary,
          content: editingDoc.content,
          changeLog: changeLog || "Pre-publish update",
        },
        {
          onSuccess: () => {
            publishMutation.mutate({
              slug: editingDoc.slug!,
              changeLog: changeLog || `Published release v${(editingDoc.publishedVersion || 0) + 1}`,
            });
          },
        }
      );
    }
  };

  const renderMarkdownPreview = (text: string) => {
    const lines = text.split("\n");
    return (
      <div className="space-y-3 font-sans text-xs leading-relaxed text-slate-800">
        {lines.map((line, idx) => {
          if (line.startsWith("# ")) {
            return (
              <h1 key={idx} className="text-lg font-extrabold text-slate-900 font-display pt-2 pb-1 border-b border-slate-100">
                {line.replace("# ", "")}
              </h1>
            );
          }
          if (line.startsWith("## ")) {
            return (
              <h2 key={idx} className="text-sm font-bold text-indigo-900 font-display pt-2">
                {line.replace("## ", "")}
              </h2>
            );
          }
          if (line.startsWith("### ")) {
            return (
              <h3 key={idx} className="text-xs font-bold text-slate-900 pt-1">
                {line.replace("### ", "")}
              </h3>
            );
          }
          if (line.startsWith("* ") || line.startsWith("- ")) {
            return (
              <div key={idx} className="flex items-start gap-2 pl-2">
                <span className="text-indigo-600 font-bold">•</span>
                <span>{line.substring(2)}</span>
              </div>
            );
          }
          if (line.startsWith("> ")) {
            return (
              <blockquote key={idx} className="p-2.5 bg-indigo-50/60 border-l-3 border-indigo-500 rounded-r-xl text-slate-700 italic">
                {line.replace("> ", "")}
              </blockquote>
            );
          }
          if (!line.trim()) return <div key={idx} className="h-1" />;
          return <p key={idx}>{line}</p>;
        })}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* 1. Header & Navigation */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
              <Scale className="w-5 h-5" />
            </span>
            <h1 className="text-xl font-bold font-display text-slate-900">
              Legal & Content Management
            </h1>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Centrally manage, version, draft, and publish all legal, privacy, and informational pages to mobile clients.
          </p>
        </div>

        <button
          onClick={handleCreateNew}
          className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-2 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          New Legal Document
        </button>
      </div>

      {/* 2. Overview Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white border border-slate-200/80 p-5 rounded-2xl shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-slate-400">Total Legal Pages</p>
            <h3 className="text-xl font-bold text-slate-900 font-display mt-0.5">{legalDocs.length}</h3>
          </div>
          <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
            <FileText className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white border border-slate-200/80 p-5 rounded-2xl shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-slate-400">Published & Live</p>
            <h3 className="text-xl font-bold text-emerald-600 font-display mt-0.5">{publishedCount}</h3>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <Globe className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white border border-slate-200/80 p-5 rounded-2xl shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-slate-400">Drafts / In Review</p>
            <h3 className="text-xl font-bold text-amber-600 font-display mt-0.5">{draftCount}</h3>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
            <Edit3 className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* 3. Filter Tabs & Search */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-slate-200/80 shadow-xs">
        <div className="flex items-center gap-1.5 overflow-x-auto">
          {(["all", "published", "draft", "unpublished", "archived"] as const).map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold capitalize transition-all cursor-pointer ${
                statusFilter === st ? "bg-indigo-50 text-indigo-600" : "text-slate-500 hover:text-slate-900"
              }`}
            >
              {st}
              {st === "published" && ` (${publishedCount})`}
              {st === "draft" && ` (${draftCount})`}
              {st === "archived" && ` (${archivedCount})`}
            </button>
          ))}
        </div>

        <div className="relative min-w-[240px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search policies or slugs..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-indigo-500 font-medium"
          />
        </div>
      </div>

      {/* 4. Legal Documents Table */}
      <div className="bg-white border border-slate-200/80 rounded-2xl shadow-xs overflow-hidden">
        {docsLoading ? (
          <div className="p-8 space-y-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-16 bg-slate-50 rounded-xl shimmer" />
            ))}
          </div>
        ) : filteredDocs.length === 0 ? (
          <div className="py-16 text-center">
            <FileText className="w-12 h-12 text-slate-300 mx-auto mb-2" />
            <h3 className="text-sm font-bold text-slate-900 font-display">No Documents Found</h3>
            <p className="text-xs text-slate-400 mt-1">Try adjusting your filter or create a new legal policy.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/80 text-slate-500 text-[11px] font-bold uppercase tracking-wider border-b border-slate-100">
                <tr>
                  <th className="px-6 py-3.5">Policy Title & Slug</th>
                  <th className="px-6 py-3.5">Status</th>
                  <th className="px-6 py-3.5">Live Release</th>
                  <th className="px-6 py-3.5">Last Updated By</th>
                  <th className="px-6 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {filteredDocs.map((doc) => {
                  const isPublished = doc.status === "published";
                  const isDraft = doc.status === "draft";
                  const isArchived = doc.status === "archived";

                  return (
                    <tr key={doc.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center flex-shrink-0">
                            <BookOpen className="w-4 h-4" />
                          </div>
                          <div>
                            <h4 className="text-xs font-bold text-slate-900">{doc.title}</h4>
                            <span className="text-[11px] text-slate-400 font-mono">/settings/policy/{doc.slug}</span>
                            {doc.summary && (
                              <p className="text-[11px] text-slate-500 truncate max-w-sm mt-0.5">{doc.summary}</p>
                            )}
                          </div>
                        </div>
                      </td>

                      <td className="px-6 py-4">
                        <span
                          className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase ${
                            isPublished
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                              : isDraft
                              ? "bg-amber-50 text-amber-700 border border-amber-200"
                              : isArchived
                              ? "bg-rose-50 text-rose-600 border border-rose-200"
                              : "bg-slate-100 text-slate-600 border border-slate-200"
                          }`}
                        >
                          {doc.status}
                        </span>
                      </td>

                      <td className="px-6 py-4">
                        <div className="flex items-center gap-1.5">
                          <span className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded-md text-[11px] font-mono font-bold">
                            v{doc.publishedVersion || doc.version || 1}
                          </span>
                          {doc.version > (doc.publishedVersion || 0) && (
                            <span className="text-[10px] text-amber-600 font-semibold">
                              (Draft v{doc.version} pending)
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="px-6 py-4">
                        <div className="text-[11px] text-slate-600">
                          <p className="font-semibold">{doc.updatedBy || "admin"}</p>
                          <span className="text-slate-400">
                            {doc.updatedAt
                              ? new Date(
                                  doc.updatedAt._seconds ? doc.updatedAt._seconds * 1000 : doc.updatedAt
                                ).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
                              : "—"}
                          </span>
                        </div>
                      </td>

                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => setHistorySlug(doc.slug)}
                            title="Version History"
                            className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors cursor-pointer"
                          >
                            <History className="w-4 h-4" />
                          </button>

                          <button
                            onClick={() => handleOpenEditor(doc)}
                            title="Edit Document"
                            className="p-1.5 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>

                          {isArchived ? (
                            <button
                              onClick={() => restoreMutation.mutate(doc.slug)}
                              title="Restore to Draft"
                              className="px-2.5 py-1 text-[11px] bg-indigo-50 hover:bg-indigo-100 text-indigo-600 rounded-lg font-bold transition-colors cursor-pointer flex items-center gap-1"
                            >
                              <ArchiveRestore className="w-3 h-3" />
                              Restore
                            </button>
                          ) : isPublished ? (
                            <button
                              onClick={() => unpublishMutation.mutate(doc.slug)}
                              title="Unpublish"
                              className="px-2.5 py-1 text-[11px] bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-bold transition-colors cursor-pointer"
                            >
                              Unpublish
                            </button>
                          ) : (
                            <button
                              onClick={() => publishMutation.mutate({ slug: doc.slug })}
                              title="Publish Live"
                              className="px-2.5 py-1 text-[11px] bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold transition-colors shadow-xs cursor-pointer flex items-center gap-1"
                            >
                              <Send className="w-3 h-3" />
                              Publish
                            </button>
                          )}

                          {!isArchived && (
                            <button
                              onClick={() => archiveMutation.mutate(doc.slug)}
                              title="Archive"
                              className="p-1.5 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors cursor-pointer"
                            >
                              <Archive className="w-4 h-4" />
                            </button>
                          )}

                          <button
                            onClick={() => {
                              if (confirm(`Are you sure you want to delete "${doc.title}"?`)) {
                                deleteMutation.mutate(doc.slug);
                              }
                            }}
                            title="Delete Policy"
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 5. Document Editor Modal (Split View Markdown + Live Formatter) */}
      <AnimatePresence>
        {editingDoc && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
          >
            <motion.div
              initial={{ scale: 0.96, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.96, y: 20 }}
              className="bg-white rounded-3xl max-w-5xl w-full h-[90vh] p-6 border border-slate-200 shadow-2xl flex flex-col justify-between"
            >
              <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                    <Edit3 className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold font-display text-slate-900">
                      {isNewDoc ? "Create New Legal Document" : `Editing: ${editingDoc.title}`}
                    </h3>
                    <p className="text-xs text-slate-400">
                      Changes are drafted and versioned before publishing to live mobile apps.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <div className="bg-slate-100 p-1 rounded-xl flex items-center text-xs font-semibold">
                    <button
                      type="button"
                      onClick={() => setPreviewMode("edit")}
                      className={`px-2.5 py-1 rounded-lg transition-all ${
                        previewMode === "edit" ? "bg-white text-indigo-600 shadow-xs" : "text-slate-500"
                      }`}
                    >
                      Editor Only
                    </button>
                    <button
                      type="button"
                      onClick={() => setPreviewMode("split")}
                      className={`px-2.5 py-1 rounded-lg transition-all ${
                        previewMode === "split" ? "bg-white text-indigo-600 shadow-xs" : "text-slate-500"
                      }`}
                    >
                      Split View
                    </button>
                    <button
                      type="button"
                      onClick={() => setPreviewMode("preview")}
                      className={`px-2.5 py-1 rounded-lg transition-all ${
                        previewMode === "preview" ? "bg-white text-indigo-600 shadow-xs" : "text-slate-500"
                      }`}
                    >
                      Live Preview
                    </button>
                  </div>

                  <button
                    onClick={() => setEditingDoc(null)}
                    className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg cursor-pointer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 py-3 border-b border-slate-100">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                    Document Title
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Privacy Policy"
                    value={editingDoc.title || ""}
                    onChange={(e) => {
                      const title = e.target.value;
                      const slug = isNewDoc
                        ? title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")
                        : editingDoc.slug;
                      setEditingDoc({ ...editingDoc, title, slug });
                    }}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-indigo-500 font-semibold"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                    URL Slug / Route Key
                  </label>
                  <input
                    type="text"
                    required
                    disabled={!isNewDoc}
                    placeholder="e.g. privacy-policy"
                    value={editingDoc.slug || ""}
                    onChange={(e) => setEditingDoc({ ...editingDoc, slug: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-indigo-500 font-mono disabled:opacity-60"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                    Short Summary (Subtitle)
                  </label>
                  <input
                    type="text"
                    placeholder="Brief description of the policy..."
                    value={editingDoc.summary || ""}
                    onChange={(e) => setEditingDoc({ ...editingDoc, summary: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4 py-3 min-h-0 overflow-hidden">
                {(previewMode === "edit" || previewMode === "split") && (
                  <div className={`flex flex-col h-full ${previewMode === "edit" ? "md:col-span-2" : ""}`}>
                    <div className="flex items-center justify-between pb-2 text-[11px] font-bold text-slate-500 uppercase">
                      <span>Markdown Source</span>
                      <span className="text-slate-400 font-normal">Supports # H1, ## H2, * list, &gt; quote</span>
                    </div>
                    <textarea
                      value={editingDoc.content || ""}
                      onChange={(e) => setEditingDoc({ ...editingDoc, content: e.target.value })}
                      placeholder="Write policy content in Markdown..."
                      className="flex-1 w-full p-4 text-xs font-mono bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:border-indigo-500 resize-none leading-relaxed"
                    />
                  </div>
                )}

                {(previewMode === "preview" || previewMode === "split") && (
                  <div className={`flex flex-col h-full bg-slate-50/70 p-4 border border-slate-200 rounded-2xl overflow-y-auto ${previewMode === "preview" ? "md:col-span-2" : ""}`}>
                    <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-200">
                      <span className="text-[11px] font-bold text-slate-500 uppercase flex items-center gap-1.5">
                        <Eye className="w-3.5 h-3.5 text-indigo-600" />
                        Mobile Render Preview
                      </span>
                      <span className="px-2 py-0.5 bg-indigo-100 text-indigo-700 rounded-md text-[10px] font-bold">
                        Markdown Live
                      </span>
                    </div>
                    {renderMarkdownPreview(editingDoc.content || "")}
                  </div>
                )}
              </div>

              <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <input
                    type="text"
                    placeholder="Change log (e.g. Updated section 2)..."
                    value={changeLog}
                    onChange={(e) => setChangeLog(e.target.value)}
                    className="px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-indigo-500 w-full sm:w-72"
                  />
                </div>

                <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
                  <button
                    type="button"
                    onClick={() => setEditingDoc(null)}
                    className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all cursor-pointer"
                  >
                    Cancel
                  </button>

                  <button
                    type="button"
                    disabled={updateDraftMutation.isPending || createMutation.isPending}
                    onClick={handleSaveDraft}
                    className="px-4 py-2.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    <Save className="w-3.5 h-3.5" />
                    Save Draft (v{(editingDoc.version || 1) + 1})
                  </button>

                  <button
                    type="button"
                    disabled={publishMutation.isPending}
                    onClick={handlePublishFromEditor}
                    className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    <Send className="w-3.5 h-3.5" />
                    Publish Live to App
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 6. Version History Drawer / Modal */}
      <AnimatePresence>
        {historySlug && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
          >
            <motion.div
              initial={{ scale: 0.96, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.96, y: 20 }}
              className="bg-white rounded-3xl max-w-2xl w-full p-6 border border-slate-200 shadow-2xl space-y-4"
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                    <History className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold font-display text-slate-900">
                      Version History: {historySlug}
                    </h3>
                    <p className="text-xs text-slate-400">
                      Audit trail of all previous versions and published releases.
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => setHistorySlug(null)}
                  className="p-1 text-slate-400 hover:text-slate-700 rounded-lg cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="max-h-[60vh] overflow-y-auto space-y-3 pr-1">
                {versionsLoading ? (
                  <div className="space-y-3">
                    {[...Array(3)].map((_, i) => (
                      <div key={i} className="h-20 bg-slate-50 rounded-xl shimmer" />
                    ))}
                  </div>
                ) : versions.length === 0 ? (
                  <div className="py-12 text-center text-xs text-slate-400">
                    No version history recorded yet.
                  </div>
                ) : (
                  versions.map((ver) => (
                    <div
                      key={ver.id}
                      className="p-4 bg-slate-50/70 border border-slate-200/80 rounded-2xl flex items-start justify-between gap-4"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 bg-indigo-100 text-indigo-700 rounded-md font-mono font-bold text-xs">
                            v{ver.version}
                          </span>
                          <span
                            className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase ${
                              ver.status === "published"
                                ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                : "bg-amber-50 text-amber-700 border border-amber-200"
                            }`}
                          >
                            {ver.status}
                          </span>
                          <h4 className="text-xs font-bold text-slate-900">{ver.title}</h4>
                        </div>

                        <p className="text-xs text-slate-600 italic">
                          "{ver.changeLog || "No change log notes"}"
                        </p>

                        <div className="flex items-center gap-2 text-[11px] text-slate-400">
                          <span>By: {ver.createdBy || "admin"}</span>
                          <span>•</span>
                          <span>
                            {ver.createdAt
                              ? new Date(
                                  ver.createdAt._seconds ? ver.createdAt._seconds * 1000 : ver.createdAt
                                ).toLocaleString("en-US", {
                                  month: "short",
                                  day: "numeric",
                                  year: "numeric",
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })
                              : "—"}
                          </span>
                        </div>
                      </div>

                      <button
                        onClick={() => {
                          const targetDoc = legalDocs.find((d) => d.slug === historySlug);
                          if (targetDoc) {
                            setEditingDoc({
                              ...targetDoc,
                              title: ver.title,
                              content: ver.content,
                            });
                            setHistorySlug(null);
                            setChangeLog(`Restored content from v${ver.version}`);
                          }
                        }}
                        className="px-3 py-1.5 bg-white hover:bg-indigo-50 text-indigo-600 border border-slate-200 rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1 cursor-pointer flex-shrink-0"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        Restore to Editor
                      </button>
                    </div>
                  ))
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

