document.addEventListener('DOMContentLoaded', function() {
  let croppers = [];
  let files = [];
  const maxImages = 5;
  const minImages = 3;
  let currentCropIndex = null;
  let currentCropper = null;
  let croppedCanvas = null;

  // Real-time price validation
  document.getElementById('salePrice').addEventListener('input', function() {
    const regularPrice = parseFloat(document.getElementById('regularPrice').value);
    const salePrice = parseFloat(this.value);
    const salePriceError = document.getElementById('salePriceError');
    if (salePrice > regularPrice && !isNaN(regularPrice)) {
      salePriceError.textContent = 'Sale price must be less than or equal to regular price.';
      salePriceError.style.display = 'block';
    } else {
      salePriceError.style.display = 'none';
    }
  });

  // Form Validation and Submission
  document.getElementById('addProductForm').addEventListener('submit', async (e) => {
    e.preventDefault();

    let isValid = true;
    let errorMessages = [];

    document.querySelectorAll('.error-msg').forEach(el => {
      el.style.display = 'none';
      el.textContent = '';
    });

    const name = document.getElementById('name').value.trim();
    if (!name || name.length < 3) {
      isValid = false;
      const nameError = document.getElementById('nameError');
      nameError.textContent = 'Product name must be at least 3 characters long.';
      nameError.style.display = 'block';
      errorMessages.push(nameError.textContent);
    }

    const description = document.getElementById('description').value.trim();
    if (!description || description.length < 10) {
      isValid = false;
      const descriptionError = document.getElementById('descriptionError');
      descriptionError.textContent = 'Description must be at least 10 characters long.';
      descriptionError.style.display = 'block';
      errorMessages.push(descriptionError.textContent);
    }

    const category = document.getElementById('category').value;
    if (!category) {
      isValid = false;
      const categoryError = document.getElementById('categoryError');
      categoryError.textContent = 'Please select a category.';
      categoryError.style.display = 'block';
      errorMessages.push(categoryError.textContent);
    }

    const brand = document.getElementById('brand').value.trim();
    if (!brand) {
      isValid = false;
      const brandError = document.getElementById('brandError');
      brandError.textContent = 'Please select a brand.';
      brandError.style.display = 'block';
      errorMessages.push(brandError.textContent);
    }

    const stock = parseInt(document.getElementById('stock').value);
    if (isNaN(stock) || stock < 0) {
      isValid = false;
      const stockError = document.getElementById('stockError');
      stockError.textContent = 'Stock quantity must be a non-negative number.';
      stockError.style.display = 'block';
      errorMessages.push(stockError.textContent);
    }

    const regularPrice = parseFloat(document.getElementById('regularPrice').value);
    if (isNaN(regularPrice) || regularPrice <= 0) {
      isValid = false;
      const regularPriceError = document.getElementById('regularPriceError');
      regularPriceError.textContent = 'Regular price must be a positive number.';
      regularPriceError.style.display = 'block';
      errorMessages.push(regularPriceError.textContent);
    }

    const salePrice = parseFloat(document.getElementById('salePrice').value);
    if (isNaN(salePrice) || salePrice <= 0) {
      isValid = false;
      const salePriceError = document.getElementById('salePriceError');
      salePriceError.textContent = 'Sale price must be a positive number.';
      salePriceError.style.display = 'block';
      errorMessages.push(salePriceError.textContent);
    }

    if (isValid && salePrice > regularPrice) {
      isValid = false;
      const salePriceError = document.getElementById('salePriceError');
      salePriceError.textContent = 'Sale price must be less than or equal to regular price.';
      salePriceError.style.display = 'block';
      errorMessages.push(salePriceError.textContent);
    }

    const imageInput = document.getElementById('images');
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png'];
    const maxSize = 5 * 1024 * 1024;

    if (files.length < minImages) {
      isValid = false;
      const imagesError = document.getElementById('imagesError');
      imagesError.textContent = `At least ${minImages} images are required.`;
      imagesError.style.display = 'block';
      errorMessages.push(imagesError.textContent);
    } else if (files.length > maxImages) {
      isValid = false;
      const imagesError = document.getElementById('imagesError');
      imagesError.textContent = `You can upload a maximum of ${maxImages} images.`;
      imagesError.style.display = 'block';
      errorMessages.push(imagesError.textContent);
    } else {
      files.forEach((file, index) => {
        if (!allowedTypes.includes(file.type)) {
          isValid = false;
          const imagesError = document.getElementById('imagesError');
          imagesError.textContent = 'Only JPEG, JPG, and PNG images are allowed.';
          imagesError.style.display = 'block';
          errorMessages.push(imagesError.textContent);
        }
        if (file.size > maxSize) {
          isValid = false;
          const imagesError = document.getElementById('imagesError');
          imagesError.textContent = 'Each image must be less than 5MB.';
          imagesError.style.display = 'block';
          errorMessages.push(imagesError.textContent);
        }
      });
    }

    if (!isValid) {
      Swal.fire({
        icon: 'error',
        title: 'Validation Error',
        html: errorMessages.join('<br>')
      });
      return;
    }

    Swal.fire({
      title: 'Add Product',
      text: 'Are you sure you want to add this product?',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#3085d6',
      cancelButtonColor: '#d33',
      confirmButtonText: 'Yes, add it!'
    }).then(async (result) => {
      if (result.isConfirmed) {
        const submitBtn = document.getElementById('submitBtn');
        submitBtn.disabled = true;
        submitBtn.textContent = 'Adding...';
        const formData = new FormData(document.getElementById('addProductForm'));
        try {
          const response = await fetch('/admin/product/add', {
            method: 'POST',
            body: formData
          });
          if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Failed to add product');
          }
          Swal.fire({
            icon: 'success',
            title: 'Product Added',
            text: 'Product has been added successfully',
            toast: true,
            position: 'top-end',
            showConfirmButton: false,
            timer: 2000
          });
          window.location.href = '/admin/product';
        } catch (error) {
          Swal.fire({
            icon: 'error',
            title: 'Error',
            text: error.message
          });
          submitBtn.disabled = false;
          submitBtn.textContent = 'Add Product';
        }
      }
    });
  });

  // Image handling and Cropper.js logic
  const imageInput = document.getElementById('images');
  const previewContainer = document.getElementById('imagePreviewContainer');
  const cropModal = document.getElementById('cropModal');
  const croppedImagePreview = document.getElementById('croppedImagePreview');
  const saveCropBtn = document.getElementById('saveCropBtn');
  const cancelCropBtn = document.getElementById('cancelCropBtn');

  imageInput.addEventListener('change', function(e) {
    files = Array.from(e.target.files).filter(file => file.type.startsWith('image/'));
    if (files.length > maxImages) {
      Swal.fire({
        icon: 'error',
        title: 'Too many images',
        text: `You can upload a maximum of ${maxImages} images.`
      });
      imageInput.value = '';
      files = [];
      resetCropperUI();
      return;
    }

    resetCropperUI();
    files.forEach((file, index) => {
      viewImage(file, index);
    });
  });

  function resetCropperUI() {
    croppers.forEach(cropper => cropper?.destroy());
    croppers = [];
    previewContainer.innerHTML = '';
    closeCropModal();
  }

  function viewImage(file, index) {
    const reader = new FileReader();
    reader.onload = function(e) {
      const wrapper = document.createElement('div');
      wrapper.className = 'image-preview-wrapper';

      const img = document.createElement('img');
      img.className = 'image-preview-img';
      img.src = e.target.result;

      const cropBtn = document.createElement('button');
      cropBtn.className = 'crop-btn';
      cropBtn.textContent = 'Crop';
      cropBtn.type = 'button';
      cropBtn.setAttribute('aria-label', `Crop image ${index + 1}`);

      const removeBtn = document.createElement('button');
      removeBtn.className = 'remove-btn';
      removeBtn.innerHTML = '×';
      removeBtn.type = 'button';
      removeBtn.setAttribute('aria-label', `Remove image ${index + 1}`);

      wrapper.appendChild(img);
      wrapper.appendChild(cropBtn);
      wrapper.appendChild(removeBtn);
      previewContainer.appendChild(wrapper);

      if (typeof Cropper === 'undefined') {
        console.error('Cropper.js is not loaded.');
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: 'Image cropper library could not be loaded. Please check your internet connection.'
        });
        return;
      }

      img.onload = function() {
        try {
          const cropper = new Cropper(img, {
            aspectRatio: 1,
            viewMode: 1,
            guides: true,
            background: false,
            autoCropArea: 0.8,
            cropBoxResizable: true,
            dragMode: 'move'
          });
          croppers[index] = cropper;

          cropBtn.onclick = function() {
            if (!croppers[index]) return;
            croppedCanvas = croppers[index].getCroppedCanvas({
              width: 600,
              height: 600
            });
            currentCropIndex = index;
            currentCropper = croppers[index];
            croppedImagePreview.src = croppedCanvas.toDataURL('image/jpeg');
            cropModal.style.display = 'flex';
          };
        } catch (error) {
          console.error('Error initializing Cropper:', error);
          Swal.fire({
            icon: 'error',
            title: 'Error',
            text: 'Failed to initialize image cropper. Please try again.'
          });
        }
      };

      img.onerror = function() {
        console.error('Failed to load image:', file.name);
        if (croppers[index]) {
          croppers[index].destroy();
          croppers[index] = null;
        }
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: 'Failed to load image. Please select a valid image file.'
        });
        wrapper.remove();
        files.splice(index, 1);
        updateFileInput();
      };

      removeBtn.onclick = function() {
        if (croppers[index]) {
          croppers[index].destroy();
          croppers[index] = null;
        }
        files.splice(index, 1);
        wrapper.remove();
        updateFileInput();
      };
    };
    reader.readAsDataURL(file);
  }

  function updateFileInput() {
    const dataTransfer = new DataTransfer();
    files.forEach(file => dataTransfer.items.add(file));
    document.getElementById('images').files = dataTransfer.files;
  }

  function closeCropModal() {
    cropModal.style.display = 'none';
    croppedImagePreview.src = '';
    currentCropIndex = null;
    croppedCanvas = null;
    currentCropper = null;
  }

  saveCropBtn.onclick = function() {
    if (croppedCanvas && currentCropIndex !== null && currentCropper !== null) {
      croppedCanvas.toBlob(function(blob) {
        const timestamp = new Date().getTime();
        const fileName = `cropped-img-${timestamp}-${currentCropIndex}.jpeg`;
        const croppedFile = new File([blob], fileName, { type: 'image/jpeg' });
        files[currentCropIndex] = croppedFile;

        const wrapper = previewContainer.children[currentCropIndex];
        const img = wrapper.querySelector('img');
        img.src = croppedCanvas.toDataURL('image/jpeg');

        const cropBtn = wrapper.querySelector('.crop-btn');
        if (cropBtn) {
          cropBtn.style.display = 'none';
        }

        if (croppers[currentCropIndex]) {
          croppers[currentCropIndex].destroy();
          croppers[currentCropIndex] = null;
        }

        updateFileInput();
        closeCropModal();

        Swal.fire({
          icon: 'success',
          title: 'Image Cropped',
          text: 'The image has been successfully cropped.',
          toast: true,
          position: 'top-end',
          showConfirmButton: false,
          timer: 1500
        });
      }, 'image/jpeg', 0.9);
    } else {
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'No cropped image available. Please try again.',
        toast: true,
        position: 'top-end',
        showConfirmButton: false,
        timer: 1500
      });
      closeCropModal();
    }
  };

  cancelCropBtn.onclick = function() {
    closeCropModal();
  };
});