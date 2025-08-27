"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent } from "@/ui/dialog";
import { Button } from "@/ui/button";
import { X, ChevronLeft, ChevronRight } from "lucide-react";
import { useLang } from "@/lang/useLang";

export default function WelcomeModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const { lang } = useLang();

  // Hàm lấy danh sách ảnh dựa theo ngôn ngữ
  const getWelcomeImages = () => {
    switch (lang) {
      case 'kr':
        return ['/beta-kr.jpg'];
      case 'en':
        return ['/beta-en.jpg'];
      case 'vi':
        return ['/beta-vi.jpg'];
      case 'jp':
        return ['/beta-jp.jpg'];
      default:
        return ['/beta-kr.jpg']; // Fallback
    }
  };

  const images = getWelcomeImages();

  // Auto slide effect
  useEffect(() => {
    if (!isOpen) return;

    const interval = setInterval(() => {
      setCurrentImageIndex((prev) => (prev + 1) % images.length);
    }, 3000); // Change image every 3 seconds

    return () => clearInterval(interval);
  }, [isOpen, images.length]);

  // Reset image index when modal opens
  useEffect(() => {
    if (isOpen) {
      setCurrentImageIndex(0);
    }
  }, [isOpen]);

  useEffect(() => {
    // Kiểm tra thời gian đóng modal lần cuối
    const lastClosedTime = localStorage.getItem("welcomeModalLastClosed");
    const currentTime = Date.now();
    const oneHourInMs = 1 * 60 * 60 * 1000; // 1 giờ tính bằng milliseconds

    // Nếu chưa có thời gian đóng hoặc đã qua 1 giờ kể từ lần đóng cuối
    if (!lastClosedTime || (currentTime - parseInt(lastClosedTime)) > oneHourInMs) {
      // Hiển thị modal sau 1 giây để trang load xong
      const timer = setTimeout(() => {
        setIsOpen(true);
      }, 1000);

      return () => clearTimeout(timer);
    }
  }, []);

  const handleClose = () => {
    setIsOpen(false);
    // Lưu thời gian đóng modal
    localStorage.setItem("welcomeModalLastClosed", Date.now().toString());
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      handleClose();
    }
  };

  const goToPrevious = () => {
    setCurrentImageIndex((prev) => (prev - 1 + images.length) % images.length);
  };

  const goToNext = () => {
    if (currentImageIndex < images.length - 1) {
      setCurrentImageIndex((prev) => prev + 1);
    } else {
      // Nếu đã ở ảnh cuối cùng thì đóng modal
      handleClose();
    }
  };

  const goToImage = (index: number) => {
    setCurrentImageIndex(index);
  };

  const isLastImage = currentImageIndex === images.length - 1;

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent hiddenCloseButton={true} className="md:max-w-[50vh] max-w-[90%] overflow-hidden p-0 border-0 bg-transparent rounded-xl" onPointerDownOutside={(e) => e.preventDefault()}>
        <div className="relative w-full md:max-w-[50vh] rounded-xl">
          {/* Nút đóng - chỉ hiển thị khi ở ảnh cuối cùng */}
          {isLastImage && (
            <Button
              variant="ghost"
              size="icon"
              className="absolute top-3 right-3 z-10 bg-black/50 hover:bg-black/70 text-white rounded-full w-6 h-6"
              onClick={handleClose}
            >
              <X className="h-5 w-5" />
            </Button>
          )}

          {/* Navigation buttons */}
          {images.length > 1 && (
            <>
              {isLastImage ? (
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute left-3 top-1/2 transform -translate-y-1/2 z-10 bg-theme-gradient-glow-blue/50 hover:bg-black/70 text-white rounded-full w-8 h-8"
                  onClick={goToPrevious}
                >
                  <ChevronLeft className="h-5 w-5" />
                </Button>
              ) : <Button
                variant="ghost"
                size="icon"
                className="absolute right-3 top-1/2 transform -translate-y-1/2 z-10 bg-theme-gradient-glow-blue/50 hover:bg-black/70 text-white rounded-full w-8 h-8"
                onClick={goToNext}
              >
                <ChevronRight className="h-5 w-5" />
              </Button>}

            </>
          )}

          {/* Hình ảnh */}
          <div className="relative overflow-hidden rounded-lg">
            <img
              src={images[currentImageIndex]}
              alt={`Welcome ${currentImageIndex + 1}`}
              className="w-full h-auto object-contain transition-opacity duration-300"
            />
          </div>

          {/* Next/Close button */}
          {!isLastImage && (
            <div className="absolute bottom-3 right-3 z-10">
              <Button
                onClick={goToNext}
                className="bg-white/20 hover:bg-white/30 text-white border border-white/30 px-4 py-2 rounded-lg backdrop-blur-sm"
              >
                Next
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
} 