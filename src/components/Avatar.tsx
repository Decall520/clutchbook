import { initials } from "../lib/utils";
import type { Profile } from "../types";

interface AvatarProps {
  profile?: Pick<Profile, "id" | "display_name" | "avatar_url"> | null;
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
}

export function Avatar({ profile, size = "md", className = "" }: AvatarProps) {
  const index = profile?.id ? profile.id.charCodeAt(0) % 5 : 0;
  return (
    <span
      className={`avatar avatar-${size} avatar-variant-${index} ${className}`.trim()}
      aria-label={profile?.display_name || "用户头像"}
    >
      {profile?.avatar_url ? (
        <img src={profile.avatar_url} alt="" />
      ) : (
        <span>{initials(profile?.display_name || "选手")}</span>
      )}
    </span>
  );
}
