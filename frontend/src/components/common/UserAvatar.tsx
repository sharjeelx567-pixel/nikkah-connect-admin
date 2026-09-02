"use client";

import React, { useState, useEffect } from "react";
import { User } from "lucide-react";

interface UserAvatarProps {
  src?: string | null;
  name?: string | null;
  gender?: string | null;
  className?: string;
  iconClassName?: string;
}

export default function UserAvatar({
  src,
  name,
  gender,
  className = "w-10 h-10 rounded-xl",
  iconClassName = "w-4 h-4 text-indigo-600",
}: UserAvatarProps) {
  const [imgError, setImgError] = useState(false);

  useEffect(() => {
    setImgError(false);
  }, [src]);

  const isValidUrl =
    src &&
    typeof src === "string" &&
    src.trim().length > 0 &&
    (src.startsWith("http://") || src.startsWith("https://") || src.startsWith("data:"));

  if (isValidUrl && !imgError) {
    return (
      <div className={`${className} overflow-hidden bg-slate-100 flex-shrink-0 flex items-center justify-center border border-slate-200`}>
        <img
          src={src}
          alt={name || "Candidate"}
          className="w-full h-full object-cover"
          onError={() => setImgError(true)}
          loading="lazy"
        />
      </div>
    );
  }

  return (
    <div
      className={`${className} overflow-hidden bg-indigo-50 flex-shrink-0 flex items-center justify-center border border-indigo-100`}
      title={name || "Candidate"}
    >
      <User className={iconClassName} />
    </div>
  );
}
