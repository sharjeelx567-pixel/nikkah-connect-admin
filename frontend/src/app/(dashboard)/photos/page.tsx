'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence, useMotionValue, useTransform } from 'framer-motion';
import api from '../../../services/api';
import { NikkahUser } from '../../../types';
import { Check, X, RefreshCw, Eye, Grid, Sparkles, ShieldCheck, ZoomIn, Heart, ChevronLeft, ChevronRight } from 'lucide-react';

export default function PhotosPage() {
  const queryClient = useQueryClient();
  const [viewMode, setViewMode] = useState<'deck' | 'grid'>('deck');
  const [selectedPhoto, setSelectedPhoto] = useState<NikkahUser | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [isRejecting, setIsRejecting] = useState(false);
  const [selectedUids, setSelectedUids] = useState<string[]>([]);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  // Fetch pending photos
  const { data, isLoading } = useQuery<{ data: NikkahUser[] }>({
    queryKey: ['pending-photos'],
    queryFn: async () => {
      const response = await api.get('/photos/pending');
      return response.data;
    },
  });

  // Safely extract photos array from nested API response
  // Response shape: axios.data -> successResponse.data -> { data: [...], pagination: {...} }
  let photos: NikkahUser[] = [];
  if (data) {
    const d = data as any;
    if (Array.isArray(d)) photos = d;
    else if (Array.isArray(d?.data)) photos = d.data;
    else if (Array.isArray(d?.data?.data)) photos = d.data.data;
  }

  // Approve Photo Mutation
  const approveMutation = useMutation({
    mutationFn: async (uid: string) => {
      await api.patch(`/photos/${uid}/approve`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pending-photos'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats-badges'] });
      setSelectedPhoto(null);
    },
  });

  // Reject Photo Mutation
  const rejectMutation = useMutation({
    mutationFn: async ({ uid, reason }: { uid: string; reason: string }) => {
      await api.patch(`/photos/${uid}/reject`, { reason });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pending-photos'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats-badges'] });
      setSelectedPhoto(null);
      setRejectionReason('');
      setIsRejecting(false);
    },
    onError: (error: any) => {
      alert(`Failed to reject photo: ${error?.response?.data?.error || error.message}`);
    },
  });

  // Bulk Actions
  const bulkApproveMutation = useMutation({
    mutationFn: async (uids: string[]) => {
      await Promise.all(uids.map(uid => api.patch(`/photos/${uid}/approve`)));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pending-photos'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats-badges'] });
      setSelectedUids([]);
    },
  });

  // Tinder Swipe deck gesture helpers
  const dragX = useMotionValue(0);
  const rotate = useTransform(dragX, [-200, 200], [-30, 30]);
  const opacity = useTransform(dragX, [-200, -150, 0, 150, 200], [0.5, 1, 1, 1, 0.5]);
  const rejectOpacity = useTransform(dragX, [0, -100], [0, 1]);
  const approveOpacity = useTransform(dragX, [0, 100], [0, 1]);

  const handleDragEnd = (_event: any, info: any) => {
    if (photos.length === 0) return;
    const currentCard = photos[0];
    const threshold = 120;

    if (info.offset.x > threshold) {
      approveMutation.mutate(currentCard.uid);
    } else if (info.offset.x < -threshold) {
      setSelectedPhoto(currentCard);
      setIsRejecting(true);
    }
  };

  const toggleSelectUid = (uid: string) => {
    setSelectedUids(prev =>
      prev.includes(uid) ? prev.filter(id => id !== uid) : [...prev, uid]
    );
  };

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 relative z-10">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="aspect-square bg-white/5 rounded-3xl border border-primary/10 shimmer" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6 relative">
      {/* Background neon blobs */}
      <div className="absolute top-10 left-10 w-96 h-96 radial-glow-primary rounded-full blur-[100px] pointer-events-none z-0" />

      {/* Top Header Controls bar */}
      <div className="flex flex-col md:flex-row gap-4 justify-between items-center glass p-4 border border-primary/10 rounded-3xl shadow-neon-primary relative z-10">
        <div>
          <h3 className="text-sm font-bold font-display text-text-primary">Photo Moderation Queue</h3>
          <p className="text-[10px] text-text-secondary font-bold uppercase tracking-wider mt-0.5">Verify profiles avatars before public deployment</p>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => setViewMode('deck')}
            className={`py-1.5 px-3 rounded-xl text-xs font-semibold uppercase tracking-wider transition-all flex items-center gap-1.5 cursor-pointer ${
              viewMode === 'deck' ? 'bg-primary text-white shadow-neon-primary' : 'bg-slate-100 text-text-secondary hover:text-text-primary'
            }`}
          >
            <Heart className="w-4 h-4" /> Tinder Deck
          </button>
          <button
            onClick={() => setViewMode('grid')}
            className={`py-1.5 px-3 rounded-xl text-xs font-semibold uppercase tracking-wider transition-all flex items-center gap-1.5 cursor-pointer ${
              viewMode === 'grid' ? 'bg-primary text-white shadow-neon-primary' : 'bg-slate-100 text-text-secondary hover:text-text-primary'
            }`}
          >
            <Grid className="w-4 h-4" /> Bulk Grid
          </button>
        </div>
      </div>

      {photos.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 glass border border-primary/10 rounded-3xl text-center relative z-10 shadow-neon-primary">
          <div className="w-16 h-16 bg-success/15 rounded-full flex items-center justify-center text-success mb-4 border border-success/20 animate-pulse">
            <ShieldCheck className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-bold text-text-primary font-display">Deck Completed!</h3>
          <p className="text-xs text-text-secondary font-semibold mt-1">
            All pending user avatars have been audited.
          </p>
        </div>
      ) : viewMode === 'deck' ? (
        /* Tinder Deck Mode container */
        <div className="flex flex-col items-center justify-center min-h-[500px] relative z-10">
          <div className="relative w-80 aspect-[4/5] z-10 flex items-center justify-center">
            <AnimatePresence mode="popLayout">
              {photos.slice(0, 2).map((user, idx) => {
                const isTop = idx === 0;

                return (
                  <motion.div
                    key={user.uid}
                    style={isTop ? { x: dragX, rotate, opacity } : { scale: 0.95, y: 15, zIndex: 0 }}
                    drag={isTop ? 'x' : false}
                    dragConstraints={{ left: 0, right: 0 }}
                    onDragEnd={handleDragEnd}
                    initial={isTop ? { scale: 0.9, opacity: 0 } : false}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ x: dragX.get() > 0 ? 300 : -300, opacity: 0, scale: 0.8 }}
                    transition={{ type: 'spring', stiffness: 300, damping: 28 }}
                    className="absolute inset-0 bg-bg-surface rounded-3xl border border-primary/10 shadow-neon-primary overflow-hidden flex flex-col justify-between cursor-grab active:cursor-grabbing select-none"
                  >
                    <div className="flex-1 min-h-0 bg-white/3 relative group">
                      <img src={user.profileImage} alt="" className="absolute inset-0 w-full h-full object-cover pointer-events-none" />
                      
                      <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-black/85 pointer-events-none" />
                      <motion.div style={{ opacity: rejectOpacity }} className="absolute top-4 left-4 border-2 border-error text-error text-[10px] font-bold uppercase tracking-widest px-3 py-1 rounded-lg transform -rotate-12 pointer-events-none">
                        REJECT
                      </motion.div>
                      <motion.div style={{ opacity: approveOpacity }} className="absolute top-4 right-4 border-2 border-success text-success text-[10px] font-bold uppercase tracking-widest px-3 py-1 rounded-lg transform rotate-12 pointer-events-none">
                        APPROVE
                      </motion.div>
                    </div>

                    <div className="p-5 border-t border-primary/10 bg-white/2">
                      <div className="flex justify-between items-center">
                        <div>
                          <h4 className="font-bold text-sm text-text-primary font-display">{user.displayName || 'Anonymous'}</h4>
                          <p className="text-[10px] text-text-secondary font-bold uppercase tracking-wider mt-0.5">{user.city} â€¢ {user.gender}</p>
                        </div>
                        <button
                          onClick={() => { setSelectedPhoto(user); setCurrentImageIndex(0); }}
                          className="p-2 hover:bg-white/5 border border-primary/15 rounded-xl cursor-pointer transition-colors"
                        >
                          <ZoomIn className="w-4 h-4 text-[#8B88A0] hover:text-white" />
                        </button>
                      </div>

                      <div className="flex gap-3 mt-4 pt-4 border-t border-primary/10">
                        <button
                          onClick={() => {
                            setSelectedPhoto(user);
                            setIsRejecting(true);
                          }}
                          className="flex-1 py-2.5 bg-error/10 hover:bg-error/15 text-error border border-error/15 rounded-xl font-bold text-xs flex items-center justify-center gap-1 cursor-pointer transition-colors"
                        >
                          <X className="w-4 h-4" /> Reject
                        </button>
                        <button
                          onClick={() => approveMutation.mutate(user.uid)}
                          className="flex-1 py-2.5 bg-success hover:bg-success-dark text-white rounded-xl font-bold text-xs flex items-center justify-center gap-1 cursor-pointer shadow-sm transition-colors"
                        >
                          <Check className="w-4 h-4" /> Approve
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
        /* Bulk Grid Mode container */
        <div className="space-y-4 relative z-10">
          {/* Bulk Selection Actions row */}
          {selectedUids.length > 0 && (
            <div className="p-3 bg-primary/15 border border-primary/20 rounded-2xl flex items-center justify-between text-xs animate-fade-in shadow-neon-primary">
              <span className="font-bold text-primary-light">{selectedUids.length} Photos Selected</span>
              <div className="flex gap-2">
                <button
                  onClick={() => bulkApproveMutation.mutate(selectedUids)}
                  className="py-1.5 px-3 bg-success hover:bg-success-dark text-white font-bold rounded-xl cursor-pointer shadow-sm"
                >
                  Approve Selected
                </button>
                <button
                  onClick={() => setSelectedUids([])}
                  className="py-1.5 px-3 bg-slate-100 border border-primary/10 rounded-xl font-semibold text-text-secondary hover:text-text-primary cursor-pointer"
                >
                  Deselect
                </button>
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
            {photos.map((user) => {
              const isChecked = selectedUids.includes(user.uid);
              return (
                <div
                  key={user.uid}
                  className={`bg-bg-surface border rounded-3xl overflow-hidden group shadow-sm hover:shadow-premium relative transition-all duration-300 ${
                    isChecked ? 'border-primary ring-1 ring-primary' : 'border-primary/10'
                  }`}
                >
                  {/* Select Checkbox badge */}
                  {((user.pendingGalleryImages?.length ?? 0) > 1) && (
                    <div className="absolute top-2 right-2 bg-black/60 backdrop-blur-md text-white text-[10px] font-bold px-2 py-1 rounded-lg z-20 border border-white/10">
                      +{(user.pendingGalleryImages?.length ?? 0) - 1}
                    </div>
                  )}
                  <button
                    onClick={() => toggleSelectUid(user.uid)}
                    className={`absolute top-2 left-2 w-5 h-5 rounded-lg z-20 flex items-center justify-center border cursor-pointer transition-all ${
                      isChecked ? 'bg-primary border-primary text-white' : 'bg-black/40 backdrop-blur-xs border-primary/20 text-transparent'
                    }`}
                  >
                    âœ“
                  </button>

                  <div className="aspect-[4/5] bg-white/3 relative overflow-hidden">
                    <img src={user.profileImage} alt="" className="w-full h-full object-cover group-hover:scale-102 transition-transform duration-300" />
                    
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent opacity-0 group-hover:opacity-100 transition-opacity flex justify-end p-2 items-end">
                      <button
                        onClick={() => { setSelectedPhoto(user); setCurrentImageIndex(0); }}
                        className="p-2 bg-white/20 hover:bg-white/30 backdrop-blur-xs text-white rounded-xl cursor-pointer"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <div className="p-3 text-xs border-t border-primary/10 bg-bg-surface">
                    <h4 className="font-bold text-text-primary truncate font-display">{user.displayName}</h4>
                    <p className="text-[10px] text-text-secondary truncate mt-0.5">{user.city}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Review Modal dialog */}
      <AnimatePresence>
        {selectedPhoto && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-bg-surface rounded-3xl max-w-2xl w-full overflow-hidden shadow-2xl border border-primary/10 flex flex-col md:flex-row max-h-[90vh]"
            >
                            <div className="md:w-1/2 aspect-square md:aspect-auto bg-black flex flex-col items-center justify-center relative group">
                {(() => {
                  const gallery = (selectedPhoto.pendingGalleryImages && selectedPhoto.pendingGalleryImages.length > 0)
                    ? selectedPhoto.pendingGalleryImages
                    : [selectedPhoto.profileImage].filter(Boolean);
                  
                  return (
                    <>
                      <img src={gallery[currentImageIndex]} alt="" className="w-full h-full object-contain" />
                      
                      {gallery.length > 1 && (
                        <>
                          <button
                            onClick={() => setCurrentImageIndex(prev => Math.max(0, prev - 1))}
                            disabled={currentImageIndex === 0}
                            className="absolute left-2 top-1/2 -translate-y-1/2 p-2 bg-black/50 text-white rounded-full disabled:opacity-30 hover:bg-black/80 transition-all z-10"
                          >
                            <ChevronLeft className="w-5 h-5" />
                          </button>
                          
                          <button
                            onClick={() => setCurrentImageIndex(prev => Math.min(gallery.length - 1, prev + 1))}
                            disabled={currentImageIndex === gallery.length - 1}
                            className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-black/50 text-white rounded-full disabled:opacity-30 hover:bg-black/80 transition-all z-10"
                          >
                            <ChevronRight className="w-5 h-5" />
                          </button>
                          
                          <div className="absolute bottom-4 flex gap-1.5 z-10">
                            {gallery.map((_, idx) => (
                              <button
                                key={idx}
                                onClick={() => setCurrentImageIndex(idx)}
                                className={`h-1.5 rounded-full transition-all ${idx === currentImageIndex ? 'w-4 bg-primary' : 'w-1.5 bg-white/50 hover:bg-white'}`}
                              />
                            ))}
                          </div>
                          
                          <div className="absolute top-4 right-4 bg-black/60 text-white text-[10px] font-bold px-2.5 py-1 rounded-full z-10 backdrop-blur-md">
                            {currentImageIndex + 1} / {gallery.length}
                          </div>
                        </>
                      )}
                    </>
                  );
                })()}
              </div>

              <div className="md:w-1/2 p-6 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between">
                    <h3 className="text-base font-bold font-display text-text-primary">Avatar Audit</h3>
                    <button
                      onClick={() => {
                        setSelectedPhoto(null);
                        setIsRejecting(false);
                      }}
                      className="p-1 hover:bg-slate-100 border border-primary/10 rounded-xl text-text-secondary hover:text-text-primary transition-colors cursor-pointer"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  <div className="mt-6 space-y-3 text-xs">
                    <div>
                      <span className="text-[9px] text-text-secondary uppercase font-bold tracking-wider">User Details</span>
                      <p className="font-bold text-text-primary text-sm mt-0.5">{selectedPhoto.displayName}</p>
                      <p className="text-[10px] text-text-secondary">{selectedPhoto.email}</p>
                    </div>
                  </div>
                </div>

                <div className="mt-8 space-y-3">
                  {!isRejecting ? (
                    <>
                      <button
                        onClick={() => approveMutation.mutate(selectedPhoto.uid)}
                        className="w-full py-3 bg-success hover:bg-success-dark text-white rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
                      >
                        <Check className="w-4 h-4" /> Approve Photo
                      </button>
                      <div className="flex gap-2">
                        <button
                          onClick={() => setIsRejecting(true)}
                          className="flex-1 py-2.5 bg-error/10 hover:bg-error/15 border border-error/10 text-error rounded-xl font-bold text-xs flex items-center justify-center gap-1 cursor-pointer"
                        >
                          <X className="w-4 h-4" /> Reject
                        </button>
                        <button
                          onClick={() => {
                            setSelectedPhoto(null);
                          }}
                          className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-text-secondary hover:text-text-primary border border-primary/10 rounded-xl font-semibold text-xs cursor-pointer"
                        >
                          Cancel
                        </button>
                      </div>
                    </>
                  ) : (
                    <div className="space-y-4 text-xs">
                      <div>
                        <label className="block font-bold uppercase tracking-widest text-text-secondary text-[9px] mb-1">Rejection Reason</label>
                        <textarea
                          rows={3}
                          value={rejectionReason}
                          onChange={(e) => setRejectionReason(e.target.value)}
                          placeholder="e.g. Image contains logos/watermarks, blurry..."
                          className="w-full p-2.5 bg-slate-50 border border-primary/15 rounded-xl focus:outline-none focus:border-primary/50 text-xs text-text-primary placeholder:text-text-secondary animate-fade-in"
                        />
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => setIsRejecting(false)}
                          className="flex-1 py-2 bg-slate-100 border border-primary/10 text-text-secondary hover:text-text-primary rounded-xl font-semibold cursor-pointer"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={() => rejectMutation.mutate({ uid: selectedPhoto.uid, reason: rejectionReason })}
                          disabled={!rejectionReason || rejectMutation.isPending}
                          className="flex-1 py-2 bg-error hover:bg-error-dark text-white rounded-xl font-bold disabled:opacity-50 cursor-pointer"
                        >
                          {rejectMutation.isPending ? 'Rejecting...' : 'Confirm'}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}


