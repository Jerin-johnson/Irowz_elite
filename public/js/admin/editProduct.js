document.addEventListener('DOMContentLoaded', function () {
  const form = document.getElementById('editProductForm');
  const imageInput = document.getElementById('images');
  const imagePreviewContainer = document.getElementById('imagePreviewContainer');
  const removedImagesInput = document.getElementById('removedImages');
  const existingImagesInput = document.getElementById('existingImages');
  let croppedImages = [];
  let cropper;
  let currentFileIndex = 0;
  let filesToCrop = [];

  // Handle existing image removal
  document.querySelectorAll('.remove-btn').forEach(button => {
    button.addEventListener('click', function () {
      const wrapper = this.parentElement;
      const imageId = wrapper.dataset.imageId;
      const removedImages = JSON.parse(removedImagesInput.value || '[]');
      removedImages.push(imageId);
      removedImagesInput.value = JSON.stringify(removedImages);
      wrapper.remove();
    });
  });

  // Handle new image uploads and initiate cropping
  imageInput.addEventListener('change', function (e) {
    filesToCrop = Array.from(e.target.files);
    croppedImages = [];
    currentFileIndex = 0;

    const minImages = 3;
    const maxImages = 5;
    const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg'];
    const maxSize = 5 * 1024 * 1024; // 5MB
    const existingImages = JSON.parse(existingImagesInput.value || '[]');
    const totalImages = existingImages.length - JSON.parse(removedImagesInput.value || '[]').length + filesToCrop.length;

    if (totalImages < minImages || totalImages > maxImages) {
      document.getElementById('imagesError').textContent = `Please ensure 3 to 5 images in total.`;
      document.getElementById('imagesError').style.display = 'block';
      return;
    }

    for (const file of filesToCrop) {
      if (!allowedTypes.includes(file.type)) {
        document.getElementById('imagesError').textContent = 'Only JPEG, JPG, or PNG images are allowed.';
        document.getElementById('imagesError').style.display = 'block';
        return;
      }
      if (file.size > maxSize) {
        document.getElementById('imagesError').textContent = 'Each image must be less than 5MB.';
        document.getElementById('imagesError').style.display = 'block';
        return;
      }
    }

    imageInput.value = ''; // Clear file input to prevent sending original files
    if (filesToCrop.length > 0) {
      showCropModal(filesToCrop[0]);
    }
  });

  // Show crop modal for new images
  function showCropModal(file) {
    const reader = new FileReader();
    reader.onload = function (event) {
      const cropModal = document.getElementById('cropModal');
      const croppedImagePreview = document.getElementById('croppedImagePreview');
      croppedImagePreview.src = event.target.result;
      cropModal.style.display = 'flex';
      cropper = new Cropper(croppedImagePreview, {
        aspectRatio: 1,
        viewMode: 1,
      });
    };
    reader.readAsDataURL(file);
  }

  // Save cropped image
  document.getElementById('saveCropBtn').addEventListener('click', function () {
    const canvas = cropper.getCroppedCanvas();
    const dataUrl = canvas.toDataURL('image/jpeg');
    croppedImages.push(dataUrl);

    const imgElement = document.createElement('img');
    imgElement.src = dataUrl;
    imgElement.classList.add('image-preview-img');

    const wrapper = document.createElement('div');
    wrapper.classList.add('image-preview-wrapper');
    wrapper.appendChild(imgElement);
    const removeBtn = document.createElement('button');
    removeBtn.classList.add('remove-btn');
    removeBtn.textContent = '×';
    removeBtn.type = 'button';
    removeBtn.addEventListener('click', function () {
      wrapper.remove();
      croppedImages.splice(croppedImages.indexOf(dataUrl), 1);
    });
    wrapper.appendChild(removeBtn);
    imagePreviewContainer.appendChild(wrapper);

    cropper.destroy();
    document.getElementById('cropModal').style.display = 'none';

    currentFileIndex++;
    if (currentFileIndex < filesToCrop.length) {
      showCropModal(filesToCrop[currentFileIndex]);
    }
  });

  // Cancel cropping
  document.getElementById('cancelCropBtn').addEventListener('click', function () {
    cropper.destroy();
    document.getElementById('cropModal').style.display = 'none';
    currentFileIndex++;
    if (currentFileIndex < filesToCrop.length) {
      showCropModal(filesToCrop[currentFileIndex]);
    }
  });

  // Close crop modal
  document.getElementById('closeCropModalBtn').addEventListener('click', function () {
    cropper.destroy();
    document.getElementById('cropModal').style.display = 'none';
    croppedImages = [];
  });

  // Form submission
  form.addEventListener('submit', async function (e) {
    e.preventDefault();
    const submitBtn = document.getElementById('submitBtn');
    submitBtn.disabled = true;
    submitBtn.textContent = 'Updating...';

    const formData = new FormData(form);
    croppedImages.forEach((dataUrl, index) => {
      const blob = dataURLToBlob(dataUrl);
      formData.append('images', blob, `image${index}.jpg`);
    });

    try {
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
    const byteArrays = [];
    for (let i = 0; i < byteCharacters.length; i++) {
      byteArrays.push(byteCharacters.charCodeAt(i));
    }
    return new Blob([new Uint8Array(byteArrays)], { type: contentType });
  }
});