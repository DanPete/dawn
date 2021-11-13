class SettingEventSetup {
  constructor(config) {
    this.endpoint = '/apps/slash/api/settings'
    this.discountDataAttr = 'data-slash-discount-price'
    this.discountDataAttrSelector = '[data-slash-discount-price]'
    this.priceContainerDataAttr = 'data-slash-container'
    this.priceContainerSelector = '[data-slash-container]'
    this.productCardSelector = '[data-slash-product]'
    this.productFormSelector = 'form[action="/cart/add"]'
    this.cartFormSelector = 'form[action="/cart"]'
    this.lineItemSelector = 'data-item-key'
    this.discountLineItemProperty = 'slash_discount_eligible'
    this.timeoutDelay = 150;
    this.discountAmount = config.discountAmount;
    this.discountType = config.discountType;
    this.discountTypes = {
      percentage: 'percentage',
      fixed: 'fixed_amount',
      all: 'all'
    }
    this.discountData = config.discountData;
    this.discountItemsCount = 1;
    this.discountPricePosition = 'beforebegin'
    this.priceTypes = {
      product: 'product',
      lineItem: 'lineItem',
      subtotal: 'subtotal'
    }
  }

  async initProduct() {
    this.settings = await this.getSettings();
    this.originalPriceSelector = this.settings.productSelector;
    window.slash.settings = this.settings;
    this.addFormListeners();
    this.setupProductPrice();
  }

  async initCart() {
    this.settings = this.settings || await this.getSettings();
    window.slash.settings = this.settings;
    this.originalCartItemPriceSelector = this.settings.cartItemSelector;
    this.originalCartItemTotalPriceSelector = this.settings.cartItemTotalSelector;
    this.originalCartSubtotalPriceSelector = this.settings.cartSubtotalSelector;
    this.cartItemsData = window.slash.cart.items;
    this.setupCartPrices(this.cartItemsData);

    const cartForms = document.querySelectorAll(this.cartFormSelector)
    this.debounceCartChange = this.debounce(this.handleCartChange)
    window.addEventListener('cart:change', this.debounceCartChange.bind(this))

    cartForms.forEach(cartForm => {
      const cartFormParent = cartForm.parentElement;
      if (cartFormParent) {
        this.addCartMutationObserver(cartFormParent);

      }
    })
  }

  async initProductCard() {
    this.settings = this.settings || await this.getSettings();
    window.slash.settings = this.settings;
    this.originalProductCardPriceSelector = this.settings.collectionSelector;
    const productCards = document.querySelectorAll(this.productCardSelector);
    if (productCards.length === 0) return;
    productCards.forEach(productCard => {
      const productCardPriceElement = productCard.querySelector(this.originalProductCardPriceSelector)
      this.setupProductCardPrices(productCardPriceElement, productCard);
    })
  }

  async handleCartChange() {
    console.log('cart change')
    try {
      const res = await fetch('/cart.js');
      const cart = await res.json()
      setTimeout(() => {
        this.setupCartPrices(cart.items);
      }, this.timeoutDelay);
      this.cartItemsData = cart.items;
    } catch (error) {
      console.log(error)
    }
  }

  async getSettings() {
    const res = await fetch(this.endpoint)
    return await res.json();
  }

  addFormListeners() {
    const productForms = document.querySelectorAll(this.productFormSelector)

    this.debounceFormChange = this.debounce(this.handleFormChange)

    if (productForms.length > 0) {
      productForms.forEach(form => form.addEventListener('change', this.debounceFormChange.bind(this)));
    }

    // TODO: Might not need if all events are being captured by productForm changes
    // const variantInput = document.querySelector('[name="id"]')
    // if (variantInput) {
    //   variantInput.addEventListener('change', this.handleVariantChange.bind(this))
    // }


    // TODO: Only if really necessary for older themes

    // const inputs = document.querySelectorAll('input');
    // const selects = document.querySelectorAll('select');

    // if (inputs.length > 0) {
    //   inputs.forEach(input => input.addEventListener('click', this.handleVariantChange.bind(this)))
    // }
    // if (selects.length > 0) {
    //   selects.forEach(select => select.addEventListener('change', this.handleVariantChange.bind(this)))
    // }
  }

  debounce(func, timeout = 300){
    let timer;
    return (...args) => {
      clearTimeout(timer);
      timer = setTimeout(() => { func.apply(this, args); }, timeout);
    };
  }

  // handleVariantChange() {
  //   setTimeout(() => {
  //     const discountPriceElement = document.querySelector(`${this.discountDataAttr}`)
  //     if (discountPriceElement) {
  //       console.log('still found it');
  //     } else {
  //       this.duplicatePrice();
  //     }
  //   }, 750);
  // }

  async handleFormChange() {
    setTimeout(() => {
      const discountPriceElement = document.querySelector(this.discountDataAttrSelector)
      const originalPriceElement = document.querySelector(this.originalPriceSelector)


      if (discountPriceElement) {
        this.currentDiscountPriceCents = this.getCurrentPrice(discountPriceElement);
        this.currentOriginalPriceCents = this.getCurrentPrice(originalPriceElement);

        const checkPrice = this.isDiscountPriceCorrect(this.currentOriginalPriceCents, this.currentDiscountPriceCents, this.discountAmount, this.priceTypes.product)

        if (checkPrice == false) {
          this.updateDiscountPrice(discountPriceElement, originalPriceElement);
        }
      } else {
        console.log('needs to recreate discount element')
        this.duplicatePrice(originalPriceElement, this.priceTypes.product)
      }
    }, this.timeoutDelay);
  }

  setupProductPrice() {
    const productPrice = document.querySelector(this.originalPriceSelector);
    this.duplicatePrice(productPrice, this.priceTypes.product);
    this.addDiscountCartAttrInput();
  }

  setupCartPrices(cartItemsData) {
    const itemKeys = document.querySelectorAll(`[${this.lineItemSelector}]`);
    this.discountEligibleItems = []
    cartItemsData.forEach(cartItem => {
      if (cartItem.properties?.hasOwnProperty(this.discountLineItemProperty)) {
        this.discountEligibleItems.push(cartItem);
      }
    })
    this.discountItemsCount = this.discountEligibleItems.length;
    this.discountEligibleItems.forEach(discountItem => {
      const itemKeyValue = discountItem.key

      if (this.originalCartItemPriceSelector !== '') {
        const itemPriceElements = document.querySelector(`[${this.lineItemSelector}="${itemKeyValue}"] ${this.originalCartItemPriceSelector}`)

        itemPriceElements.forEach(itemPriceElement => {
          if (this.updateExistingPriceElement(itemPriceTotalElement)) {
            console.log('update existing element')
          } else {
            this.duplicatePrice(itemPriceElement, this.priceTypes.lineItem)
          }
        })
      }

      if (this.originalCartItemTotalPriceSelector !== '') {
        const itemPriceTotalElements = document.querySelectorAll(`[${this.lineItemSelector}="${itemKeyValue}"] ${this.originalCartItemTotalPriceSelector}`)

        itemPriceTotalElements.forEach(itemPriceTotalElement => {
          if (this.updateExistingPriceElement(itemPriceTotalElement)) {
            console.log('update existing element')
          } else {
            console.log('trying to update item price')
            this.duplicatePrice(itemPriceTotalElement, this.priceTypes.lineItem)
          }
        })
      }
    })

    if (this.discountItemsCount > 0) {
      const subTotalPriceElement = document.querySelector(this.originalCartSubtotalPriceSelector)
      if (this.updateExistingPriceElement(subTotalPriceElement)) {
        console.log('update existing element')
      } else {
        this.duplicatePrice(subTotalPriceElement, this.priceTypes.subtotal)
      }
    }
  }

  updateExistingPriceElement(originalPriceElement) {
    const closestPriceContainer = originalPriceElement.closest(this.priceContainerSelector);
    if (closestPriceContainer) {
      const discountPriceElement = closestPriceContainer.querySelector(this.discountDataAttrSelector)
      this.updateDiscountPrice(discountPriceElement, originalPriceElement)
      return true;
    }
  }

  // removeDiscountPriceElement(originalPriceElement) {
  //   const closestPriceContainer = originalPriceElement.closest(this.priceContainerSelector);
  //   if (!closestPriceContainer) return;

  //   const discountPriceElement = closestPriceContainer.querySelector(this.discountDataAttrSelector)
  //   discountPriceElement.remove();
  // }

  addCartMutationObserver(cartParent) {
    console.log('init cart observer', cartParent)
    const config = {
      childList: true,
      subtree: true,
    }

    const callback = (mutationsList, observer) => {
      for(const mutation of mutationsList) {
        console.log(mutation)
        if (mutation.type === 'childList' || mutation.type === 'subtree') {
          cartParent.dispatchEvent(new CustomEvent('cart:change', { bubbles: true }));
          break;
        }
      }
    }

    const observer = new MutationObserver(callback);

    observer.observe(cartParent, config);
  }

  setupProductCardPrices(productCardPriceElement, productCard) {
    if (!productCardPriceElement) return;
    const { slashProduct, slashCollections } = productCard.dataset;

    const slashProductId = parseInt(slashProduct);
    const slashCollectionsArr = slashCollections
      .split(',')
      .filter(collectionId => collectionId !== '')
      .map(collectionId => parseInt(collectionId));
    console.log(slashCollectionsArr)

    if(!this.checkProductCardEligibility(slashProductId, slashCollectionsArr)) return;

    this.duplicatePrice(productCardPriceElement, this.priceTypes.product)
  }

  checkProductCardEligibility(productId, productCollectionIds) {
    const { target_selection, entitled_product_ids, entitled_collection_ids } = this.discountData;

    if (target_selection === this.discountTypes.all) {
      return true;
    }

    if (entitled_product_ids.length > 0 && entitled_product_ids.includes(productId)) {
      return true;
    }

    if (entitled_collection_ids.length > 0) {
      return entitled_collection_ids.find(collection => productCollectionIds.includes(collection))
    }
  }

  duplicatePrice(priceElement, priceType) {
    console.log(priceElement)
    if (!priceElement) return;

    const clone = priceElement.cloneNode(true);

    const currentPriceCents = this.getCurrentPrice(priceElement)
    const discountPrice = this.calculateDiscount(currentPriceCents, this.discountAmount, priceType)
    clone.setAttribute(this.discountDataAttr, discountPrice);

    this.wrapDiv(priceElement);

    clone.className = '';
    this.copyNodeStyle(priceElement, clone)
    clone.classList.add('slash-price-styles')
    this.updateDiscountPrice(clone, priceElement, priceType);

    priceElement.style.textDecoration = 'line-through'
    priceElement.insertAdjacentElement(this.discountPricePosition, clone)
  }

  wrapDiv(element) {
    const wrapper = document.createElement('div');
    wrapper.style.display = 'inline-flex';
    wrapper.setAttribute(this.priceContainerDataAttr, '')
    element.parentNode.insertBefore(wrapper, element);
    wrapper.appendChild(element)
  }

  addDiscountCartAttrInput() {
    // TODO: This isn't really a good idea to add to all forms, but it is needed for Dawn right now. :(
    const productForms = document.querySelectorAll(this.productFormSelector)

    productForms.forEach(productForm => {
      const input = document.createElement('input');
      input.type = 'hidden';
      input.name = `properties[${this.discountLineItemProperty}]`;
      input.value = 'true'
      productForm.insertAdjacentElement('afterbegin', input)
    })
  };

  getCurrentPrice(priceElement) {
    const currentPriceCents = this.textPriceToCents(priceElement)
    return currentPriceCents
  }

  updateDiscountPrice(discountElement, priceElement, priceType) {
    const currentPriceCents = this.textPriceToCents(priceElement);
    const discountPrice = this.calculateDiscount(currentPriceCents, this.discountAmount, priceType)
    discountElement.textContent = window.slash.money.format(discountPrice);
  }

  textPriceToCents (element) {
    if (!element) return;
    return parseInt(element.textContent.replace(/\D+/g, ''))
  }

  calculateDiscount(cents, discountAmount, priceType) {
    const convertedDiscount = this.convertDiscountValue(discountAmount)
    if (this.discountType === this.discountTypes.percentage) {
      if (priceType === this.priceTypes.subtotal
        && this.cartItemsData.length > this.discountItemsCount
      ) {
        return this.calculateSubtotalFromLineItems(cents, convertedDiscount)
      }
      return Math.ceil(cents - (cents * convertedDiscount))
    } else if (this.discountType === this.discountTypes.fixed) {
      if (priceType === this.priceTypes.lineItem) {
        return this.spreadDiscountBetweenLineItems(cents, convertedDiscount);
      }
      return Math.ceil(cents - convertedDiscount);
    }
  }

  spreadDiscountBetweenLineItems(cents, discountAmount) {
    return Math.ceil(cents - (discountAmount / this.discountItemsCount))
  }

  calculateSubtotalFromLineItems(cents, discountAmount) {
    let subtotal = cents
    console.log(this.discountEligibleItems)
    this.discountEligibleItems.forEach(discountItem => {
      subtotal = subtotal - (discountItem.final_line_price * discountAmount)
    })
    return Math.ceil(subtotal)
  }

  isDiscountPriceCorrect(originalPrice, discountPrice, discountAmount, priceType) {
    const convertedDiscount = this.convertDiscountValue(discountAmount)
    if (this.discountType === this.discountTypes.percentage) {
      return Math.ceil(originalPrice - (originalPrice * convertedDiscount)) === discountPrice
    } else if (this.discountType === this.discountTypes.fixed) {
      return Math.ceil(originalPrice - convertedDiscount) === discountPrice
    }
  }

  convertDiscountValue(value) {
    if (this.discountType === this.discountTypes.percentage) {
      return Math.abs(0.01 * parseInt(value))
    } else if (this.discountType === this.discountTypes.fixed) {
      return Math.abs(100 * parseInt(value))
    }
  }

  copyNodeStyle(sourceNode, targetNode) {
    const excludedProperties = ['color', 'margin-right', '-webkit-text-fill-color', 'text-decoration', 'width']
    const computedStyle = window.getComputedStyle(sourceNode);
    Array.from(computedStyle).forEach(key =>  {
      if (!excludedProperties.includes(key)) {
        targetNode.style.setProperty(key, computedStyle.getPropertyValue(key), computedStyle.getPropertyPriority(key))
      }
    })
  }
}

class Discounts {
  constructor() {
    this.endpoint = '/apps/slash/api/discounts';
  }

  getCurrentDiscount() {
    const cookies = document.cookie.split('; ');
    const activeDiscount = cookies.find((cookie) =>
      cookie.startsWith('discount_code=')
    );
    if (!activeDiscount) return;

    const activeDiscountCode = activeDiscount.split('=')[1];
    return activeDiscountCode;
  }

  async getDiscountRules() {
    this.discountCode = this.getCurrentDiscount();
    if (!this.discountCode) return;
    console.log(this.discountCode);
    try {
      const res = await fetch(`${this.endpoint}/${this.discountCode}`);
      this.discountData = await res.json();
      window.slash.discount = this.discountData;

      this.SettingEventSetup = new SettingEventSetup({
        discountAmount: this.discountData.value,
        discountType: this.discountData.value_type,
        discountData: this.discountData
      })

      this.discountActive = this.isDiscountActive();
      this.productEligible = this.checkProductEligibility(window.slash.product)
      if (this.discountActive && this.productEligible && window.slash.page === 'product') {
        this.SettingEventSetup.initProduct()
      }

      if (this.discountActive) {
        this.SettingEventSetup.initCart();
        this.SettingEventSetup.initProductCard()
      }
    } catch (error) {
      this.discountCodeFound = false;
      console.log(error);
    }
  }

  checkProductEligibility(product) {
    if (!product) return;
    const { target_selection, entitled_product_ids, entitled_collection_ids } = this.discountData;
    if (target_selection === this.SettingEventSetup.discountTypes.all) {
      return true;
    }

    if (entitled_product_ids.length > 0 && entitled_product_ids.includes(product.id)) {
      return true;
    }

    if (entitled_collection_ids.length > 0) {
      console.log(entitled_collection_ids, product.collections)
      return entitled_collection_ids.find(collection => product.collections.map(collection => parseInt(collection)).includes(collection))
    }
    return false
  }

  isDiscountActive() {
    const { starts_at, ends_at } = this.discountData;
    const dateNow = new Date();
    const startDate = new Date(starts_at)
    const endDate = new Date(ends_at)
    if (starts_at && ends_at) {
      if (dateNow > startDate && dateNow < endDate) {
        return true
      } else {
        return false
      }
    } else if (starts_at) {
      if (dateNow > startDate) {
        return true
      } else {
        return false
      }
    } else {
      console.log('no start or end date')
    }

  }
}

const discounts = new Discounts();
await discounts.getDiscountRules();

class ElementPicker {
  constructor() {
    this.endpoint = '/apps/slash/api/settings';

    this.slashPicker = document.querySelector('slash-picker');
    this.slashSelector = this.slashPicker.querySelector(
      `[data-slash-selector]`
    );
    this.slashSave = this.slashPicker.querySelector(`[data-slash-save]`);
    this.slashSuccessMessage = this.slashPicker.querySelector('[data-slash-success]')

    this.slashSave.addEventListener('click', this.handleSaveClick.bind(this));
  }

  checkPickerParam() {
    const searchParams = new URLSearchParams(window.location.search);
    if (searchParams.has('slash-picker')) {
      window.sessionStorage.setItem('slash-picker', true)
      const slashPickerValue = searchParams.get('slash-picker')
      console.log(slashPickerValue);
      if (slashPickerValue.includes('product')) {
        this.setupSelector = 'productSelector'
      } else if (slashPickerValue.includes('subtotal')) {
        this.setupSelector = 'cartSubtotalSelector'
        this.prepareCartSelection(slashPickerValue)
      } else if (slashPickerValue.includes('cart-item-total')) {
        this.setupSelector = 'cartItemTotalSelector'
        this.prepareCartSelection(slashPickerValue)
      } else if (slashPickerValue.includes('cart-item')) {
        this.setupSelector = 'cartItemSelector'
        this.prepareCartSelection(slashPickerValue)
      } else if (slashPickerValue.includes('collection')) {
        this.setupSelector = 'collectionSelector'
      }
      this.addPickerListeners();
      this.slashPicker.style.display = 'block';
    }
  }

  addPickerListeners() {
    document.addEventListener('mousemove', this.handlePickerHover.bind(this));
    document.addEventListener('click', this.handlePickerClick.bind(this));
  }

  handlePickerHover(e) {
    const pickerChild = [...this.slashPicker.children].some(
      (pickerChild) => e.target === pickerChild
    );
    if (e.target === this.slashPicker || pickerChild) return;

    if (this.hoverElement && this.hoverElement !== this.selectedElement) {
      this.hoverElement.style = '';
    }

    this.hoverElement = e.target;
    if (this.hoverElement === this.selectedElement) return;
    this.hoverElement.style.backgroundColor = '#005aff3b';
    this.hoverElement.style.cursor = 'pointer';
  }

  handlePickerClick(e) {
    const pickerChild = [...this.slashPicker.children].some(
      (pickerChild) => e.target === pickerChild
    );
    if (e.target === this.slashPicker || pickerChild) return;

    e.preventDefault();
    this.slashSuccessMessage.style.display = 'none'

    if (this.selectedElement) {
      this.selectedElement.style = '';
    }

    this.selectedElement = e.target;
    this.selectedElementClosest = e.target.parentElement.closest('div');

    this.selectedElement.style.border = '2px solid red';
    this.hoverElement.style.backgroundColor = '#005aff3b';
    this.hoverElement.style.cursor = 'pointer';

    this.prepareSelectorString(
      this.selectedElement,
      this.selectedElementClosest
    );
  }

  prepareSelectorString(target, parent) {
    const parentClasses = [...parent.classList].join('.');
    const parentNodeName = parent.nodeName.toLowerCase();
    const targetClasses = [...target.classList].join('.');
    const targetNodeName = target.nodeName.toLowerCase();

    if (parentClasses.length > 0 && targetClasses.length > 0 && parentClasses !== targetClasses) {
      this.selectorString = `${parentNodeName}.${parentClasses} ${targetNodeName}.${targetClasses}`;
    } else if (targetClasses.length > 0) {
      this.selectorString = `${targetNodeName}.${targetClasses}`;
    } else {
      this.selectorString = `${parentNodeName}.${parentClasses}`;
    }

    const testQuerySelector = document.querySelector(this.selectorString);
    if (testQuerySelector) {
      this.slashSelector.textContent = this.selectorString;
    }
  }

  async handleSaveClick(e) {
    e.preventDefault();
    if (!this.selectorString) {
      alert('Need to pick selector');
      return
    }
    e.currentTarget.textContent = 'Saving'
    e.currentTarget.disabled = true

    const selectorKey = this.setupSelector

    const res = await fetch(`${this.endpoint}`, {
      method: 'POST',
      body: JSON.stringify({ [selectorKey]: this.selectorString })
    });

    if (res.ok) {
      this.selectedElement.style.border = "2px solid green"
      e.target.textContent = 'Saved'
      e.target.style.background = 'green';
      this.slashSuccessMessage.style.display = 'block'
      setTimeout(() => {
        e.target.disabled = false
        e.target.textContent = 'Save'
        e.target.style.background = 'blue';
      }, 1000);
      setTimeout(() => {
        // window.close()
      }, 2000);
    } else {
      alert('Error selecting element. Try click and saving again')
      e.target.disabled = false
    }
  }

  async prepareCartSelection(slashPickerValue) {
    if (!slashPickerValue.includes(':')) return;
    const [selectorKey, variantId] = slashPickerValue.split(':')

    let formData = {
      'items': [{
        'id': parseInt(variantId),
        'quantity': 2
      }]
    }

    const res = await fetch('/cart/add.js', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(formData)
    })

    window.location = `/cart/?slash-picker=${selectorKey}`
  }
}

const picker = new ElementPicker();
picker.checkPickerParam();

// const SettingEvent = new SettingEventSetup({
//   discountAmount: '-50.0',
//   discountType: 'percentage'
// }).init()

// Mutation Observer Draft

// const targetNode = document.querySelector('form[action="/cart/add"]');

// // Options for the observer (which mutations to observe)
// const config = { attributes: true, childList: true, subtree: true };

// // Callback function to execute when mutations are observed
// const callback = function(mutationsList, observer) {
//     // Use traditional 'for loops' for IE 11
//     for(const mutation of mutationsList) {
//         console.log(mutation)
//         setTimeout(() => {
//           if(!document.querySelector('.discount-price')) {
//             price = document.querySelector('.sellPrice')
//             clone = price.cloneNode(true)
//             clone.style.color = 'red'
//             clone.style.marginRight = "8px"
//             clone.classList.add('discount-price')
//             currentPriceCents = parseInt(price.textContent.replace(/\D+/g, ''))
//             discountPrice = currentPriceCents - 1000
//             clone.textContent = `$${discountPrice}`
//             price.insertAdjacentElement('beforeBegin', clone)
//           } else {
//             price = document.querySelector('.sellPrice')
//             discountPrice = document.querySelector('.discount-price')
//             currentPriceCents = parseInt(price.textContent.replace(/\D+/g, ''))
//             discountPriceCents = currentPriceCents - 1000
//             discountPrice.textContent = clone.textContent = `$${discountPriceCents}`
//           }
//         }, 0)
//         return;
//     }
// };

// // Create an observer instance linked to the callback function
// const observer = new MutationObserver(callback);

// // Start observing the target node for configured mutations
// observer.observe(targetNode, config);


// Any input click or select change draft
// inputs = document.querySelectorAll('input')
// inputs.forEach(input => input.addEventListener('click', () => { console.log('an input was clicked')}))
// selects.forEach(select => select.addEventListener('change', () => { console.log('an input was clicked')}))
// selects.forEach(select => select.addEventListener('change', () => { console.log('a select was changed')}))
