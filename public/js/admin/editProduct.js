document.addEventListener('DOMContentLoaded', function () {
  const form = document.getElementById('editProductForm');
  const imageInput = document.getElementById('images');
  const imagePreviewContainer = document.getElementById('imagePreviewContainer');
  const removedImagesInput = document.getElementById('removedImages');
  const existingImagesInput = document.getElementById('existingImages');
  let croppedImages = [];
  let cropper = null;
  let currentFileIndex = 0;
  let filesToCrop = [];
  let isProcessingCrop = false;

  // Initialize existing image removal handlers
  initializeExistingImageHandlers();

  function initializeExistingImageHandlers() {
    document.querySelectorAll('.remove-btn').forEach(button => {
      button.addEventListener('click', handleExistingImageRemoval);
    });
  }

  function handleExistingImageRemoval() {
    const wrapper = this.parentElement;
    const imageId = wrapper.dataset.imageId;
    
    if (imageId) {
      // Handle existing images
      const removedImages = JSON.parse(removedImagesInput.value || '[]');
      removedImages.push(imageId);
      removedImagesInput.value = JSON.stringify(removedImages);
    } else {
      // Handle newly added cropped images
      const imgSrc = wrapper.querySelector('img').src;
      const index = croppedImages.indexOf(imgSrc);
      if (index > -1) {
        croppedImages.splice(index, 1);
      }
    }
    
    wrapper.remove();
    clearImageErrors();
  }

  function clearImageErrors() {
    const errorElement = document.getElementById('imagesError');
    errorElement.textContent = '';
    errorElement.style.display = 'none';
  }

  function showImageError(message) {
    const errorElement = document.getElementById('imagesError');
    errorElement.textContent = message;
    errorElement.style.display = 'block';
  }

  function resetImageProcessing() {
    filesToCrop = [];
    currentFileIndex = 0;
    isProcessingCrop = false;
    imageInput.value = '';
  }

  function destroyCropper() {
    if (cropper) {
      try {
        cropper.destroy();
      } catch (error) {
        console.warn('Error destroying cropper:', error);
      }
      cropper = null;
    }
  }

  function hideCropModal() {
    const cropModal = document.getElementById('cropModal');
    cropModal.style.display = 'none';
    destroyCropper();
  }

  // Handle new image uploads and initiate cropping
  imageInput.addEventListener('change', function (e) {
    if (isProcessingCrop) {
      return; // Prevent multiple simultaneous processing
    }

    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    clearImageErrors();
    
    // Validate files before processing
    if (!validateImageFiles(files)) {
      resetImageProcessing();
      return;
    }

    filesToCrop = files;
    currentFileIndex = 0;
    isProcessingCrop = true;

    // Start cropping process
    if (filesToCrop.length > 0) {
      showCropModal(filesToCrop[0]);
    }
  });

  function validateImageFiles(files) {
    const minImages = 3;
    const maxImages = 5;
    const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg'];
    const maxSize = 5 * 1024 * 1024; // 5MB
    
    const existingImages = JSON.parse(existingImagesInput.value || '[]');
    const removedImages = JSON.parse(removedImagesInput.value || '[]');
    const remainingExistingImages = existingImages.length - removedImages.length;
    const totalImages = remainingExistingImages + files.length;

    if (totalImages < minImages || totalImages > maxImages) {
      showImageError(`Please ensure 3 to 5 images in total. Currently: ${remainingExistingImages} existing + ${files.length} new = ${totalImages} total.`);
      return false;
    }

    for (const file of files) {
      if (!allowedTypes.includes(file.type)) {
        showImageError('Only JPEG, JPG, or PNG images are allowed.');
        return false;
      }
      if (file.size > maxSize) {
        showImageError('Each image must be less than 5MB.');
        return false;
      }
    }

    return true;
  }

  // Show crop modal for new images
  function showCropModal(file) {
    const reader = new FileReader();
    
    reader.onload = function (event) {
      const cropModal = document.getElementById('cropModal');
      const croppedImagePreview = document.getElementById('croppedImagePreview');
      
      // Clean up previous cropper
      destroyCropper();
      
      // Reset image element
      croppedImagePreview.onload = null;
      croppedImagePreview.onerror = null;
      croppedImagePreview.src = '';
      croppedImagePreview.removeAttribute('style');
      
      // Set new image source
      croppedImagePreview.src = event.target.result;
      
      // Show modal first
      cropModal.style.display = 'flex';
      
      // Initialize cropper after image loads
      croppedImagePreview.onload = function () {
        try {
          // Small delay to ensure DOM is ready
          setTimeout(() => {
            cropper = new Cropper(croppedImagePreview, {
              aspectRatio: 1,
              viewMode: 1,
              autoCropArea: 0.8,
              responsive: true,
              restore: false,
              checkCrossOrigin: false,
              checkOrientation: false,
              ready: function () {
                console.log('Cropper initialized successfully');
              },
              error: function (error) {
                console.error('Cropper error:', error);
                showImageError('Failed to initialize image cropper. Please try again.');
                hideCropModal();
                resetImageProcessing();
              }
            });
          }, 100);
        } catch (error) {
          console.error('Failed to initialize Cropper.js:', error);
          showImageError('Failed to load image cropper. Please try again.');
          hideCropModal();
          resetImageProcessing();
        }
      };
      
      croppedImagePreview.onerror = function () {
        showImageError('Failed to load image. Please select a valid image.');
        hideCropModal();
        resetImageProcessing();
      };
    };
    
    reader.onerror = function () {
      showImageError('Error reading image file. Please try again.');
      resetImageProcessing();
    };
    
    reader.readAsDataURL(file);
  }

  // Save cropped image
  document.getElementById('saveCropBtn').addEventListener('click', function () {
    if (!cropper) {
      showImageError('Cropper not initialized. Please try again.');
      return;
    }

    try {
      const canvas = cropper.getCroppedCanvas({
        width: 800,
        height: 800,
        imageSmoothingEnabled: true,
        imageSmoothingQuality: 'high'
      });
      
      if (!canvas) {
        showImageError('Failed to crop image. Please try again.');
        return;
      }

      const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
      
      // Add cropped image to array
      croppedImages.push(dataUrl);

      // Create preview element
      createImagePreview(dataUrl);

      // Move to next image or finish
      proceedToNextImage();
      
    } catch (error) {
      console.error('Error saving cropped image:', error);
      showImageError('Failed to save cropped image. Please try again.');
    }
  });

  function createImagePreview(dataUrl) {
    const wrapper = document.createElement('div');
    wrapper.classList.add('image-preview-wrapper');
    
    const imgElement = document.createElement('img');
    imgElement.src = dataUrl;
    imgElement.classList.add('image-preview-img');
    
    const removeBtn = document.createElement('button');
    removeBtn.classList.add('remove-btn');
    removeBtn.textContent = '×';
    removeBtn.type = 'button';
    removeBtn.setAttribute('aria-label', 'Remove image');
    
    removeBtn.addEventListener('click', function () {
      const index = croppedImages.indexOf(dataUrl);
      if (index > -1) {
        croppedImages.splice(index, 1);
      }
      wrapper.remove();
      clearImageErrors();
    });
    
    wrapper.appendChild(imgElement);
    wrapper.appendChild(removeBtn);
    imagePreviewContainer.appendChild(wrapper);
  }

  function proceedToNextImage() {
    hideCropModal();
    currentFileIndex++;
    
    if (currentFileIndex < filesToCrop.length) {
      // Process next image
      setTimeout(() => {
        showCropModal(filesToCrop[currentFileIndex]);
      }, 200);
    } else {
      // Finished processing all images
      resetImageProcessing();
    }
  }

  // Cancel cropping
  document.getElementById('cancelCropBtn').addEventListener('click', function () {
    proceedToNextImage();
  });

  // Close crop modal
  document.getElementById('closeCropModalBtn').addEventListener('click', function () {
    hideCropModal();
    resetImageProcessing();
  });

  // Close modal when clicking outside
  document.getElementById('cropModal').addEventListener('click', function (e) {
    if (e.target === this) {
      hideCropModal();
      resetImageProcessing();
    }
  });

  // Form submission
  form.addEventListener('submit', async function (e) {
    e.preventDefault();
    
    if (isProcessingCrop) {
      showImageError('Please wait for image processing to complete.');
      return;
    }

    const submitBtn = document.getElementById('submitBtn');
    submitBtn.disabled = true;
    submitBtn.textContent = 'Updating...';

    try {
      const formData = new FormData(form);
      
      // Add cropped images to form data
      croppedImages.forEach((dataUrl, index) => {
        const blob = dataURLToBlob(dataUrl);
        formData.append('images', blob, `cropped_image_${index}.jpg`);
      });

      const response = await fetch(form.action, {
        method: 'POST',
        body: formData
      });

      const result = await response.json();

      if (result.success) {
        Swal.fire({
          icon: 'success',
          title: 'Product updated successfully',
          showConfirmButton: false,
          timer: 1500
        }).then(() => {
          window.location.href = '/admin/product';
        });
      } else {
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: result.message || 'Failed to update product'
        });
      }
    } catch (error) {
      console.error('Form submission error:', error);
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'Failed to submit the form'
      });
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Update Product';
    }
  });

  function dataURLToBlob(dataURL) {
    const parts = dataURL.split(';base64,');
    const contentType = parts[0].split(':')[1];
    const byteCharacters = atob(parts[1]);
    const byteNumbers = new Array(byteCharacters.length);
    
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    
    return new Blob([new Uint8Array(byteNumbers)], { type: contentType });
  }
});