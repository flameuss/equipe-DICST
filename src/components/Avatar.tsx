import { useEffect, useState } from 'react';
import type { MemberRole } from '../types/team';
import { isSafeLocalPhotoPath } from '../utils/security';

interface MemberAvatarProps {
  name: string;
  initials: string;
  photo: string | null;
  role?: MemberRole;
  size?: 'sm' | 'md' | 'lg';
}

function getToneClass(role?: MemberRole): string {
  switch (role) {
    case 'Bolsista':
      return 'avatar-tone-bolsista';
    case 'Terceirizado':
      return 'avatar-tone-terceirizado';
    case 'Estagiário':
      return 'avatar-tone-estagiario';
    default:
      return 'avatar-tone-servidor';
  }
}

export function MemberAvatar({
  name,
  initials,
  photo,
  role,
  size = 'md',
}: MemberAvatarProps) {
  const [imgFailed, setImgFailed] = useState(false);

  useEffect(() => {
    setImgFailed(false);
  }, [photo]);

  const showImage = isSafeLocalPhotoPath(photo) && !imgFailed;

  return (
    <div className={`member-avatar member-avatar-${size} ${getToneClass(role)}`}>
      {showImage ? (
        <img
          src={photo!}
          alt={name}
          loading="eager"
          decoding="sync"
          className="member-avatar-img"
          onError={() => setImgFailed(true)}
        />
      ) : (
        <span aria-hidden="true" className="member-avatar-initials">
          {initials}
        </span>
      )}
    </div>
  );
}
