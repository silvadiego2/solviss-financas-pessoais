import { useState } from 'react';
import { Camera, CameraResultType, CameraSource, Photo } from '@capacitor/camera';
import { toast } from 'sonner';

export interface CameraOptions {
  quality?: number;
  width?: number;
  height?: number;
  resultType?: CameraResultType;
  source?: CameraSource;
}

export const useCamera = () => {
  const [isCapturing, setIsCapturing] = useState(false);
  const [lastPhoto, setLastPhoto] = useState<Photo | null>(null);

  const capturePhoto = async (options: CameraOptions = {}) => {
    setIsCapturing(true);
    
    try {
      const photo = await Camera.getPhoto({
        quality: options.quality || 80,
        width: options.width || 1024,
        height: options.height || 1024,
        resultType: options.resultType || CameraResultType.DataUrl,
        source: options.source || CameraSource.Camera,
        ...options,
      });

      setLastPhoto(photo);
      return photo;
    } catch (error) {
      console.error('Error capturing photo:', error);
      toast.error('Erro ao capturar foto');
      throw error;
    } finally {
      setIsCapturing(false);
    }
  };

  const selectFromGallery = async (options: Omit<CameraOptions, 'source'> = {}) => {
    return capturePhoto({
      ...options,
      source: CameraSource.Photos,
    });
  };

  const checkCameraPermission = async () => {
    try {
      const permissions = await Camera.checkPermissions();
      return permissions.camera === 'granted';
    } catch (error) {
      console.error('Error checking camera permissions:', error);
      return false;
    }
  };

  const requestCameraPermission = async () => {
    try {
      const permissions = await Camera.requestPermissions();
      return permissions.camera === 'granted';
    } catch (error) {
      console.error('Error requesting camera permissions:', error);
      toast.error('Erro ao solicitar permissões da câmera');
      return false;
    }
  };

  return {
    capturePhoto,
    selectFromGallery,
    checkCameraPermission,
    requestCameraPermission,
    isCapturing,
    lastPhoto,
  };
};