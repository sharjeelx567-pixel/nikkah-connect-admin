"use client";

import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence, useMotionValue, useTransform } from "framer-motion";
import api from "../../../services/api";
import { NikkahUser, UserPhotoDetail } from "../../../types";
import {
  Check,
  X,
  ShieldCheck,
  ZoomIn,
  Grid,
  Layers,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  AlertTriangle,
  ImageIcon,
  UserCheck,
  Images,
  Star,
  Clock,
} from "lucide-react";

export default function PhotosPage() {
  const queryClient = useQueryClient();
  const [viewMode, setViewMode] = useState<"deck" | "grid">("grid");
  const [selectedPhoto, setSelectedPhoto] = useState<NikkahUser | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [isRejecting, setIsRejecting] = useState(false);
  const [selectedUids, setSelectedUids] = useState<string[]>([]);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [detailUid, setDetailUid] = useState<string | null>(null);
  const [rejectingImageUrl, setRejectingImageUrl] = useState<string | null>(null);
  const [imageRejectionReason, setImageRejectionReason] = useState("");

  // Fetch pending photos
  const { data, isLoading } = useQuery<{ data: NikkahUser[] }>({
    queryKey: ["pending-photos"],
    queryFn: async () => {
      const response = await api.get("/photos/pending");
      return response.data;
    },
  });

  let photos: NikkahUser[] = [];
  if (data) {
    const d = data as any;
    if (Array.isArray(d)) photos = d;
    else if (Array.isArray(d?.data)) photos = d.data;
    else if (Array.isArray(d?.data?.data)) photos = d.data.data;
  }

  // Swipe deck gesture helpers
  const dragX = useMotionValue(0);
  const rotate = useTransform(dragX, [-200, 200], [-30, 30]);
  const opacity = useTransform(dragX, [-200, -150, 0, 150, 200], [0.5, 1, 1, 1, 0.5]);
  const rejectOpacity = useTransform(dragX, [0, -100], [0, 1]);
  const approveOpacity = useTransform(dragX, [0, 100], [0, 1]);

  const handleDragEnd = (_event: any, info: any) => {
    if (!photos.length) return;
    const current = photos[0];
    if (info.offset.x > 120) {
      approveMutation.mutate(current.uid);
    } else if (info.offset.x < -120) {
      setSelectedPhoto(current);
      setIsRejecting(true);
    }
  };

  // Mutations
  const approveMutation = useMutation({
    mutationFn: async (uid: string) => {
      await api.patch(`/photos/${uid}/approve`);
    },
    onSuccess: () => {
      setSelectedPhoto(null);
      setSelectedUids((prev) => prev.filter((id) => id !== selectedPhoto?.uid));
      queryClient.invalidateQueries({ queryKey: ["pending-photos"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-stats-badges"] });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: async ({ uid, reason }: { uid: string; reason: string }) => {
      await api.patch(`/photos/${uid}/reject`, { reason });
    },
    onSuccess: () => {
      setSelectedPhoto(null);
      setIsRejecting(false);
      setRejectionReason("");
      setSelectedUids((prev) => prev.filter((id) => id !== selectedPhoto?.uid));
      queryClient.invalidateQueries({ queryKey: ["pending-photos"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-stats-badges"] });
    },
  });

  const bulkApproveMutation = useMutation({
    mutationFn: async (uids: string[]) => {
      await api.post("/photos/bulk-approve", { uids });
    },
    onSuccess: () => {
      setSelectedUids([]);
      queryClient.invalidateQueries({ queryKey: ["pending-photos"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-stats-badges"] });
    },
  });

  // Per-user photo detail — every image this one user uploaded, individually.
  const { data: detailData, isLoading: isDetailLoading } = useQuery<{ data: UserPhotoDetail }>({
    queryKey: ["user-photo-detail", detailUid],
    queryFn: async () => {
      const response = await api.get(`/photos/${detailUid}`);
      return response.data;
    },
    enabled: !!detailUid,
  });
  const userDetail: UserPhotoDetail | undefined =
    (detailData as any)?.data?.data ?? (detailData as any)?.data;

  const approveImageMutation = useMutation({
    mutationFn: async ({ uid, url }: { uid: string; url: string }) => {
      await api.patch(`/photos/${uid}/images/approve`, { url });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user-photo-detail", detailUid] });
      queryClient.invalidateQueries({ queryKey: ["pending-photos"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-stats-badges"] });
    },
    onError: (error: any) => {
      console.error("[Photos] Failed to approve image:", error?.response?.status, error?.response?.data, error);
      alert(
        error?.response?.data?.error ||
          error?.response?.data?.message ||
          `Failed to approve photo (${error?.response?.status || "network error"}).`
      );
    },
  });

  const rejectImageMutation = useMutation({
    mutationFn: async ({ uid, url, reason }: { uid: string; url: string; reason: string }) => {
      await api.patch(`/photos/${uid}/images/reject`, { url, reason });
    },
    onSuccess: () => {
      setRejectingImageUrl(null);
      setImageRejectionReason("");
      queryClient.invalidateQueries({ queryKey: ["user-photo-detail", detailUid] });
      queryClient.invalidateQueries({ queryKey: ["pending-photos"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-stats-badges"] });
    },
    onError: (error: any) => {
      console.error("[Photos] Failed to reject image:", error?.response?.status, error?.response?.data, error);
      alert(
        error?.response?.data?.error ||
          error?.response?.data?.message ||
          `Failed to reject photo (${error?.response?.status || "network error"}).`
      );
    },
  });

  const toggleSelectUid = (uid: string) => {
    setSelectedUids((prev) =>
      prev.includes(uid) ? prev.filter((id) => id !== uid) : [...prev, uid]
    );
  };

  const toggleSelectAll = () => {
    if (selectedUids.length === photos.length) {
      setSelectedUids([]);
    } else {
      setSelectedUids(photos.map((p) => p.uid));
    }
  };

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="aspect-[4/5] bg-white rounded-2xl border border-slate-200/80 shimmer" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 1. Header Toolbar */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center bg-white p-5 border border-slate-200/80 rounded-2xl shadow-xs">
        <div>
          <h2 className="text-base font-bold font-display text-slate-900 flex items-center gap-2">
            <ImageIcon className="w-4 h-4 text-indigo-600" />
            Photo Moderation Queue
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Audit and approve candidate profile photos and galleries before public appearance.
          </p>
        </div>

        <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-2xl border border-slate-200">
          <button
            onClick={() => setViewMode("grid")}
            className={`py-1.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              viewMode === "grid"
                ? "bg-white text-indigo-600 shadow-xs"
                : "text-slate-500 hover:text-slate-900"
            }`}
          >
            <Grid className="w-3.5 h-3.5" /> Bulk Grid
          </button>
          <button
            onClick={() => setViewMode("deck")}
            className={`py-1.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              viewMode === "deck"
                ? "bg-white text-indigo-600 shadow-xs"
                : "text-slate-500 hover:text-slate-900"
            }`}
          >
            <Layers className="w-3.5 h-3.5" /> Review Deck
          </button>
        </div>
      </div>

      {photos.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 bg-white border border-slate-200/80 rounded-2xl text-center shadow-xs">
          <div className="w-14 h-14 bg-emerald-50 rounded-2xl flex items-center justify-center text-emerald-600 mb-3 border border-emerald-100">
            <ShieldCheck className="w-7 h-7" />
          </div>
          <h3 className="text-base font-bold text-slate-900 font-display">All Photos Audited!</h3>
          <p className="text-xs text-slate-400 mt-1">
            Zero pending candidate photos in the queue. Platform is up to date.
          </p>
        </div>
      ) : viewMode === "deck" ? (
        /* Review Deck Mode */
        <div className="flex flex-col items-center justify-center min-h-[500px] relative">
          <div className="relative w-80 aspect-[4/5] z-10 flex items-center justify-center">
            <AnimatePresence mode="popLayout">
              {photos.slice(0, 2).map((user, idx) => {
                const isTop = idx === 0;

                return (
                  <motion.div
                    key={user.uid}
                    style={isTop ? { x: dragX, rotate, opacity } : { scale: 0.95, y: 15, zIndex: 0 }}
                    drag={isTop ? "x" : false}
                    dragConstraints={{ left: 0, right: 0 }}
                    onDragEnd={handleDragEnd}
                    initial={isTop ? { scale: 0.9, opacity: 0 } : false}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ x: dragX.get() > 0 ? 300 : -300, opacity: 0, scale: 0.8 }}
                    transition={{ type: "spring", stiffness: 300, damping: 28 }}
                    className="absolute inset-0 bg-white rounded-3xl border border-slate-200/80 shadow-xl overflow-hidden flex flex-col justify-between cursor-grab active:cursor-grabbing select-none"
                  >
                    <div className="relative flex-1 bg-slate-900 overflow-hidden flex items-center justify-center">
                      <img
                        src={user.pendingProfileImage || user.profileImage || (user.photos && user.photos[0])}
                        alt=""
                        className="w-full h-full object-cover pointer-events-none"
                      />

                      {/* Swipe feedback tags */}
                      {isTop && (
                        <>
                          <motion.div
                            style={{ opacity: approveOpacity }}
                            className="absolute top-6 left-6 px-4 py-2 border-2 border-emerald-400 bg-emerald-500/30 backdrop-blur-md rounded-2xl font-black text-white uppercase tracking-wider text-sm shadow-md pointer-events-none rotate-[-12deg]"
                          >
                            Approve
                          </motion.div>
                          <motion.div
                            style={{ opacity: rejectOpacity }}
                            className="absolute top-6 right-6 px-4 py-2 border-2 border-rose-400 bg-rose-500/30 backdrop-blur-md rounded-2xl font-black text-white uppercase tracking-wider text-sm shadow-md pointer-events-none rotate-[12deg]"
                          >
                            Reject
                          </motion.div>
                        </>
                      )}
                    </div>

                    <div className="p-4 bg-white border-t border-slate-100 flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <h4 className="font-bold text-slate-900 text-sm truncate">{user.displayName || "Candidate"}</h4>
                        <p className="text-xs text-slate-400 truncate">
                          {[user.gender, user.city].filter(Boolean).join(" • ") || "—"}
                        </p>
                        <button
                          onClick={() => setDetailUid(user.uid)}
                          className="mt-1 text-[11px] font-bold text-indigo-600 hover:text-indigo-700 cursor-pointer flex items-center gap-1"
                        >
                          <Images className="w-3 h-3" /> View all photos
                        </button>
                      </div>

                      <div className="flex gap-2 shrink-0">
                        <button
                          onClick={() => {
                            setSelectedPhoto(user);
                            setIsRejecting(true);
                          }}
                          className="p-3 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-xl transition-colors cursor-pointer border border-rose-200"
                        >
                          <X className="w-5 h-5" />
                        </button>
                        <button
                          onClick={() => approveMutation.mutate(user.uid)}
                          className="p-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl transition-colors cursor-pointer shadow-xs"
                        >
                          <Check className="w-5 h-5" />
                        </button>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        </div>
      ) : (
        /* Bulk Grid Mode */
        <div className="space-y-4">
          {/* Bulk Action Toolbar */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3.5 border border-slate-200/80 rounded-2xl shadow-xs">
            <div className="flex items-center gap-3">
              <button
                onClick={toggleSelectAll}
                className="py-1.5 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
              >
                {selectedUids.length === photos.length ? "Deselect All" : "Select All"}
              </button>
              <span className="text-xs text-slate-500 font-medium">
                {selectedUids.length} selected of {photos.length}
              </span>
            </div>

            {selectedUids.length > 0 && (
              <button
                onClick={() => bulkApproveMutation.mutate(selectedUids)}
                disabled={bulkApproveMutation.isPending}
                className="py-1.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors cursor-pointer flex items-center gap-1.5"
              >
                <Check className="w-4 h-4" />
                Approve Selected ({selectedUids.length})
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
            <AnimatePresence>
              {photos.map((user) => {
                const isSelected = selectedUids.includes(user.uid);
                const displayPhoto =
                  user.pendingProfileImage || user.profileImage || (user.photos && user.photos[0]);

                return (
                  <motion.div
                    key={user.uid}
                    layout
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    className={`bg-white border rounded-2xl overflow-hidden shadow-xs hover:shadow-md transition-all flex flex-col justify-between ${
                      isSelected ? "border-indigo-600 ring-2 ring-indigo-500/20" : "border-slate-200/80"
                    }`}
                  >
                    <div className="relative aspect-[4/4.5] bg-slate-900 overflow-hidden group">
                      <img src={displayPhoto} alt="" className="w-full h-full object-cover" />

                      {/* Selection Checkbox */}
                      <button
                        onClick={() => toggleSelectUid(user.uid)}
                        className={`absolute top-2.5 left-2.5 w-6 h-6 rounded-lg flex items-center justify-center border transition-all cursor-pointer ${
                          isSelected
                            ? "bg-indigo-600 text-white border-indigo-600 shadow-sm"
                            : "bg-white/80 backdrop-blur-sm border-slate-300 text-transparent hover:border-indigo-500"
                        }`}
                      >
                        <Check className="w-3.5 h-3.5" />
                      </button>

                      {/* Zoom button */}
                      <button
                        onClick={() => {
                          setSelectedPhoto(user);
                          setCurrentImageIndex(0);
                        }}
                        className="absolute bottom-2.5 right-2.5 p-2 bg-black/60 hover:bg-black/80 text-white rounded-xl opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer backdrop-blur-sm"
                      >
                        <ZoomIn className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="p-3.5 space-y-3">
                      <div>
                        <h4 className="font-bold text-slate-900 text-xs truncate">
                          {user.displayName || "Candidate"}
                        </h4>
                        <p className="text-[11px] text-slate-400 truncate mt-0.5">
                          {[user.gender, user.city].filter(Boolean).join(" • ") || "—"}
                        </p>
                      </div>

                      <button
                        onClick={() => setDetailUid(user.uid)}
                        className="w-full py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 border border-indigo-200 rounded-xl text-[11px] font-bold transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                      >
                        <Images className="w-3.5 h-3.5" />
                        View All Photos ({1 + (user.pendingGalleryImages?.length || 0)})
                      </button>

                      <div className="flex gap-2">
                        <button
                          onClick={() => {
                            setSelectedPhoto(user);
                            setIsRejecting(true);
                          }}
                          className="flex-1 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                        >
                          Reject
                        </button>
                        <button
                          onClick={() => approveMutation.mutate(user.uid)}
                          className="flex-1 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors cursor-pointer"
                        >
                          Approve
                        </button>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        </div>
      )}

      {/* Zoom Audit Modal */}
      <AnimatePresence>
        {selectedPhoto && !isRejecting && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
            onClick={() => setSelectedPhoto(null)}
          >
            <motion.div
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.95 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-3xl max-w-2xl w-full overflow-hidden shadow-2xl border border-slate-200 flex flex-col"
            >
              <div className="relative aspect-[4/3] bg-slate-950 flex items-center justify-center overflow-hidden">
                <img
                  src={
                    selectedPhoto.pendingProfileImage ||
                    selectedPhoto.profileImage ||
                    (selectedPhoto.photos && selectedPhoto.photos[currentImageIndex])
                  }
                  alt="Audit View"
                  className="max-w-full max-h-full object-contain"
                />
              </div>

              <div className="p-5 flex items-center justify-between bg-slate-50">
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">
                    {selectedPhoto.displayName || "Candidate"}
                  </h3>
                  <p className="text-xs text-slate-400">{selectedPhoto.email}</p>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => setIsRejecting(true)}
                    className="py-2 px-4 bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 rounded-xl text-xs font-bold cursor-pointer"
                  >
                    Reject
                  </button>
                  <button
                    onClick={() => approveMutation.mutate(selectedPhoto.uid)}
                    className="py-2 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer"
                  >
                    Approve Photo
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Rejection Modal */}
      <AnimatePresence>
        {selectedPhoto && isRejecting && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
          >
            <motion.div
              initial={{ scale: 0.95, y: 15 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 15 }}
              className="bg-white rounded-3xl max-w-md w-full p-6 border border-slate-200 shadow-2xl space-y-4"
            >
              <div className="flex items-center gap-2 text-rose-600">
                <AlertTriangle className="w-5 h-5" />
                <h3 className="font-bold text-slate-900 text-base">Reject Candidate Photo</h3>
              </div>

              <p className="text-xs text-slate-500">
                Candidate: <strong className="text-slate-800">{selectedPhoto.displayName || "User"}</strong>
              </p>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Reason for Rejection *
                </label>
                <textarea
                  rows={3}
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="Explain why this photo violates guidelines (e.g. blurry, sunglasses, improper framing)..."
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
                />
              </div>

              <div className="flex gap-2.5 pt-2">
                <button
                  onClick={() => {
                    setIsRejecting(false);
                    setSelectedPhoto(null);
                  }}
                  className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  disabled={!rejectionReason || rejectMutation.isPending}
                  onClick={() =>
                    rejectMutation.mutate({
                      uid: selectedPhoto.uid,
                      reason: rejectionReason,
                    })
                  }
                  className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold disabled:opacity-50 cursor-pointer shadow-xs"
                >
                  Confirm Reject
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Per-User Photo Detail Modal — every image this user uploaded, individually */}
      <AnimatePresence>
        {detailUid && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
            onClick={() => {
              setDetailUid(null);
              setRejectingImageUrl(null);
              setImageRejectionReason("");
            }}
          >
            <motion.div
              initial={{ scale: 0.95, y: 15 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 15 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-3xl max-w-3xl w-full max-h-[85vh] overflow-y-auto shadow-2xl border border-slate-200"
            >
              <div className="sticky top-0 bg-white p-5 border-b border-slate-100 flex items-center justify-between z-10">
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">
                    {userDetail?.displayName || "Candidate"}
                  </h3>
                  <p className="text-xs text-slate-400">
                    {[userDetail?.gender, userDetail?.city].filter(Boolean).join(" • ") || userDetail?.email || "—"}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  {userDetail && (
                    <span className="py-1 px-3 bg-indigo-50 text-indigo-600 border border-indigo-200 rounded-xl text-xs font-bold">
                      {userDetail.totalImages}/{userDetail.maxImages} photos
                    </span>
                  )}
                  <button
                    onClick={() => {
                      setDetailUid(null);
                      setRejectingImageUrl(null);
                      setImageRejectionReason("");
                    }}
                    className="p-2 hover:bg-slate-100 rounded-xl cursor-pointer text-slate-500"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="p-5">
                {isDetailLoading ? (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                    {[...Array(4)].map((_, i) => (
                      <div key={i} className="aspect-[4/5] bg-slate-100 rounded-2xl shimmer" />
                    ))}
                  </div>
                ) : !userDetail || userDetail.images.length === 0 ? (
                  <p className="text-xs text-slate-400 text-center py-10">This user has no uploaded photos.</p>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                    {userDetail.images.map((img) => (
                      <div
                        key={img.url}
                        className="border border-slate-200/80 rounded-2xl overflow-hidden flex flex-col"
                      >
                        <div className="relative aspect-[4/5] bg-slate-900">
                          <img src={img.url} alt="" className="w-full h-full object-cover" />

                          <span className="absolute top-2 left-2 py-0.5 px-2 bg-black/60 backdrop-blur-sm text-white rounded-lg text-[10px] font-bold">
                            #{img.order}
                          </span>

                          {img.isMain && (
                            <span className="absolute top-2 right-2 py-0.5 px-2 bg-amber-500 text-white rounded-lg text-[10px] font-bold flex items-center gap-1">
                              <Star className="w-2.5 h-2.5 fill-white" /> Main
                            </span>
                          )}

                          <span
                            className={`absolute bottom-2 left-2 py-0.5 px-2 rounded-lg text-[10px] font-bold ${
                              img.status === "approved"
                                ? "bg-emerald-500 text-white"
                                : "bg-amber-400 text-slate-900"
                            }`}
                          >
                            {img.status === "approved" ? "Approved" : "Pending"}
                          </span>
                        </div>

                        <div className="p-2.5 space-y-2">
                          <p className="text-[10px] text-slate-400 flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {img.uploadedAt
                              ? new Date(img.uploadedAt).toLocaleDateString(undefined, {
                                  year: "numeric",
                                  month: "short",
                                  day: "numeric",
                                })
                              : "Upload date unknown"}
                          </p>

                          {img.status === "pending" && (
                            <div className="flex gap-1.5">
                              <button
                                onClick={() => setRejectingImageUrl(img.url)}
                                className="flex-1 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 rounded-lg text-[11px] font-bold transition-colors cursor-pointer"
                              >
                                Reject
                              </button>
                              <button
                                onClick={() =>
                                  approveImageMutation.mutate({ uid: detailUid, url: img.url })
                                }
                                disabled={approveImageMutation.isPending}
                                className="flex-1 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[11px] font-bold transition-colors cursor-pointer disabled:opacity-50"
                              >
                                Approve
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Per-Image Rejection Reason Modal */}
      <AnimatePresence>
        {rejectingImageUrl && detailUid && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
          >
            <motion.div
              initial={{ scale: 0.95, y: 15 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 15 }}
              className="bg-white rounded-3xl max-w-md w-full p-6 border border-slate-200 shadow-2xl space-y-4"
            >
              <div className="flex items-center gap-2 text-rose-600">
                <AlertTriangle className="w-5 h-5" />
                <h3 className="font-bold text-slate-900 text-base">Reject This Photo</h3>
              </div>

              <img
                src={rejectingImageUrl}
                alt=""
                className="w-full aspect-video object-cover rounded-xl border border-slate-200"
              />

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Reason for Rejection *
                </label>
                <textarea
                  rows={3}
                  value={imageRejectionReason}
                  onChange={(e) => setImageRejectionReason(e.target.value)}
                  placeholder="Explain why this specific photo violates guidelines..."
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
                />
              </div>

              <div className="flex gap-2.5 pt-2">
                <button
                  onClick={() => {
                    setRejectingImageUrl(null);
                    setImageRejectionReason("");
                  }}
                  className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  disabled={!imageRejectionReason || rejectImageMutation.isPending}
                  onClick={() =>
                    rejectImageMutation.mutate({
                      uid: detailUid,
                      url: rejectingImageUrl,
                      reason: imageRejectionReason,
                    })
                  }
                  className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold disabled:opacity-50 cursor-pointer shadow-xs"
                >
                  Confirm Reject
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
