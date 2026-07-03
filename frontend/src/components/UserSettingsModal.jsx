import { useCallback, useEffect, useRef, useState } from 'react';

const SUPPORTED_IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);
const MAX_IMAGE_INPUT_BYTES = 6 * 1024 * 1024;
const PROFILE_IMAGE_SIZE = 320;

const readOptimizedProfileImage = (file) => new Promise((resolve, reject) => {
  if (!file) {
    resolve('');
    return;
  }

  if (!SUPPORTED_IMAGE_TYPES.has(file.type)) {
    reject(new Error('Usa una imagen JPG, PNG o WebP.'));
    return;
  }

  if (file.size > MAX_IMAGE_INPUT_BYTES) {
    reject(new Error('La imagen debe pesar 6 MB o menos.'));
    return;
  }

  const reader = new FileReader();
  reader.onerror = () => reject(new Error('No se pudo leer la imagen.'));
  reader.onload = () => {
    const image = new Image();
    image.onerror = () => reject(new Error('No se pudo procesar la imagen.'));
    image.onload = () => {
      const longestSide = Math.max(image.width, image.height) || PROFILE_IMAGE_SIZE;
      const scale = Math.min(1, PROFILE_IMAGE_SIZE / longestSide);
      const width = Math.max(1, Math.round(image.width * scale));
      const height = Math.max(1, Math.round(image.height * scale));
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const context = canvas.getContext('2d');

      if (!context) {
        reject(new Error('No se pudo procesar la imagen.'));
        return;
      }

      context.drawImage(image, 0, 0, width, height);
      resolve(canvas.toDataURL(file.type === 'image/png' ? 'image/png' : 'image/jpeg', 0.86));
    };
    image.src = reader.result;
  };
  reader.readAsDataURL(file);
});

function UserAvatar({ className = '', initials, photoDataUrl }) {
  return (
    <div className={['settings-avatar', className].filter(Boolean).join(' ')}>
      {photoDataUrl ? (
        <img src={photoDataUrl} alt="" />
      ) : (
        <span>{initials}</span>
      )}
    </div>
  );
}

function UserSettingsModal({
  isOpen,
  onClose,
  onProfilePhotoChange,
  onProfilePhotoRemove,
  onThemeModeChange,
  profilePhotoDataUrl,
  themeMode,
  userInitials,
  userName,
  userRole,
}) {
  const fileInputRef = useRef(null);
  const [message, setMessage] = useState('');
  const [photoSaving, setPhotoSaving] = useState(false);

  const handleClose = useCallback(() => {
    setMessage('');
    onClose();
  }, [onClose]);

  useEffect(() => {
    if (!isOpen) {
      return undefined;
    }

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        handleClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleClose, isOpen]);

  if (!isOpen) {
    return null;
  }

  const handleBackdropClick = (event) => {
    if (event.target === event.currentTarget) {
      handleClose();
    }
  };

  const handleFileChange = async (event) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    setPhotoSaving(true);
    try {
      const dataUrl = await readOptimizedProfileImage(file);
      const optimizedMimeType = dataUrl.match(/^data:([^;]+);base64,/i)?.[1] || file.type;
      await onProfilePhotoChange(dataUrl, {
        filename: file.name,
        mimeType: optimizedMimeType,
      });
      setMessage('');
    } catch (error) {
      setMessage(error.message || 'No se pudo cambiar la foto.');
    } finally {
      setPhotoSaving(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleRemovePhoto = async () => {
    setPhotoSaving(true);
    try {
      await onProfilePhotoRemove();
      setMessage('');
    } catch (error) {
      setMessage(error.message || 'No se pudo quitar la foto.');
    } finally {
      setPhotoSaving(false);
    }
  };

  return (
    <div className="settings-modal-backdrop" role="presentation" onMouseDown={handleBackdropClick}>
      <section
        className="settings-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="user-settings-title"
      >
        <header className="settings-modal-header">
          <div>
            <h2 id="user-settings-title">Configuracion</h2>
            <p>{userName} - {userRole}</p>
          </div>
          <button type="button" className="settings-close-btn" aria-label="Cerrar configuracion" onClick={handleClose}>
            x
          </button>
        </header>

        <div className="settings-modal-body">
          <section className="settings-panel" aria-labelledby="profile-photo-title">
            <div>
              <h3 id="profile-photo-title">Foto de perfil</h3>
              <div className="settings-photo-row">
                <UserAvatar
                  className="settings-avatar-large"
                  initials={userInitials}
                  photoDataUrl={profilePhotoDataUrl}
                />
                <div className="settings-photo-actions">
                  <label
                    className={`btn btn-primary btn-sm${photoSaving ? ' disabled' : ''}`}
                    htmlFor={photoSaving ? undefined : 'profile-photo-input'}
                    aria-disabled={photoSaving}
                  >
                    {photoSaving ? 'Guardando...' : 'Cambiar foto'}
                  </label>
                  <input
                    ref={fileInputRef}
                    id="profile-photo-input"
                    className="visually-hidden"
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    onChange={handleFileChange}
                    disabled={photoSaving}
                  />
                  <button
                    type="button"
                    className="btn btn-outline-secondary btn-sm"
                    onClick={handleRemovePhoto}
                    disabled={!profilePhotoDataUrl || photoSaving}
                  >
                    Quitar
                  </button>
                </div>
              </div>
              {message && <div className="settings-message" role="alert">{message}</div>}
            </div>
          </section>

          <section className="settings-panel" aria-labelledby="theme-mode-title">
            <div className="settings-panel-heading">
              <h3 id="theme-mode-title">Tema</h3>
              <div className="theme-segmented" role="group" aria-label="Tema de la aplicacion">
                <button
                  type="button"
                  className={themeMode === 'light' ? 'active' : ''}
                  aria-pressed={themeMode === 'light'}
                  onClick={() => onThemeModeChange('light')}
                >
                  Claro
                </button>
                <button
                  type="button"
                  className={themeMode === 'dark' ? 'active' : ''}
                  aria-pressed={themeMode === 'dark'}
                  onClick={() => onThemeModeChange('dark')}
                >
                  Oscuro
                </button>
              </div>
            </div>
          </section>
        </div>
      </section>
    </div>
  );
}

export default UserSettingsModal;
