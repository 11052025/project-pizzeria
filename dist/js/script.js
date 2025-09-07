/* global Handlebars, utils */ // eslint-disable-line no-unused-vars

{
  'use strict';

  // =========================
  // Selectors & Config
  // =========================
  const select = {
    templateOf: {
      menuProduct: '#template-menu-product',
      cartProduct: '#template-cart-product',
    },
    containerOf: {
      menu: '#product-list',
      cart: '#cart',
    },
    all: {
      menuProducts: '#product-list > .product',
      menuProductsActive: '#product-list > .product.active',
      formInputs: 'input, select',
    },
    menuProduct: {
      clickable: '.product__header',
      form: '.product__order',
      priceElem: '.product__total-price .price',
      imageWrapper: '.product__images',
      amountWidget: '.widget-amount',
      cartButton: '[href="#add-to-cart"]',
    },
    widgets: {
      amount: {
        input: 'input.amount', // HTML uses class="amount"
        linkDecrease: 'a[href="#less"]',
        linkIncrease: 'a[href="#more"]',
      },
    },
    cart: {
      productList: '.cart__order-summary',
      toggleTrigger: '.cart__summary',
      totalNumber: `.cart__total-number`,
      totalPrice:
        '.cart__total-price strong, .cart__order-total .cart__order-price-sum strong',
      subtotalPrice: '.cart__order-subtotal .cart__order-price-sum strong',
      deliveryFee: '.cart__order-delivery .cart__order-price-sum strong',
      form: '.cart__order',
      formSubmit: '.cart__order [type="submit"]',
      phone: '[name="phone"]',
      address: '[name="address"]',
    },
    cartProduct: {
      amountWidget: '.widget-amount',
      price: '.cart__product-price',
      edit: '[href="#edit"]',
      remove: '[href="#remove"]',
    },
  };

  const classNames = {
    menuProduct: {
      wrapperActive: 'active',
      imageVisible: 'active',
    },
    cart: {
      wrapperActive: 'active',
    },
  };

  const settings = {
    amountWidget: {
      defaultValue: 1,
      defaultMin: 1,
      defaultMax: 9,
    },
    cart: {
      defaultDeliveryFee: 20,
    },
    // API configuration
    db: {
      url: '//localhost:3131',
      products: 'products',
      orders: 'orders',
    },
  };

  const templates = {
    menuProduct: Handlebars.compile(
      document.querySelector(select.templateOf.menuProduct).innerHTML
    ),
    cartProduct: Handlebars.compile(
      document.querySelector(select.templateOf.cartProduct).innerHTML
    ),
  };

  // =========================
  // Product
  // =========================
  class Product {
    constructor(id, data) {
      const thisProduct = this;

      thisProduct.id = id;
      thisProduct.data = data;

      // Render & cache
      thisProduct.renderInMenu();
      thisProduct.getElements();

      // Init behaviors
      thisProduct.initAccordion();
      thisProduct.initOrderForm();
      thisProduct.initAmountWidget();

      // First calculation
      thisProduct.processOrder();
    }

    renderInMenu() {
      const thisProduct = this;

      const generatedHTML = templates.menuProduct(thisProduct.data);
      thisProduct.element = utils.createDOMFromHTML(generatedHTML);

      const menuContainer = document.querySelector(select.containerOf.menu);
      menuContainer.appendChild(thisProduct.element);
    }

    getElements() {
      const thisProduct = this;

      // Group DOM refs to clarify intent
      thisProduct.dom = {};
      thisProduct.dom.wrapper = thisProduct.element;
      thisProduct.dom.accordionTrigger = thisProduct.dom.wrapper.querySelector(
        select.menuProduct.clickable
      );
      thisProduct.dom.form = thisProduct.dom.wrapper.querySelector(
        select.menuProduct.form
      );
      thisProduct.dom.formInputs = thisProduct.dom.form.querySelectorAll(
        select.all.formInputs
      );
      thisProduct.dom.cartButton = thisProduct.dom.wrapper.querySelector(
        select.menuProduct.cartButton
      );
      thisProduct.dom.priceElem = thisProduct.dom.wrapper.querySelector(
        select.menuProduct.priceElem
      );
      thisProduct.dom.imageWrapper = thisProduct.dom.wrapper.querySelector(
        select.menuProduct.imageWrapper
      );
      thisProduct.dom.amountWidgetElem = thisProduct.dom.wrapper.querySelector(
        select.menuProduct.amountWidget
      );
    }

    initAccordion() {
      const thisProduct = this;

      thisProduct.dom.accordionTrigger.addEventListener(
        'click',
        function (event) {
          event.preventDefault();

          // Close currently active product (if any)
          const activeProduct = document.querySelector(
            select.all.menuProductsActive
          );
          if (activeProduct && activeProduct !== thisProduct.dom.wrapper) {
            activeProduct.classList.remove(
              classNames.menuProduct.wrapperActive
            );
          }

          // Toggle this product
          thisProduct.dom.wrapper.classList.toggle(
            classNames.menuProduct.wrapperActive
          );
        }
      );
    }

    initOrderForm() {
      const thisProduct = this;

      // Recalculate on submit
      thisProduct.dom.form.addEventListener('submit', function (event) {
        event.preventDefault();
        thisProduct.processOrder();
      });

      // Recalculate on any input change
      for (let input of thisProduct.dom.formInputs) {
        input.addEventListener('change', function () {
          thisProduct.processOrder();
        });
      }

      // Add to cart
      thisProduct.dom.cartButton.addEventListener('click', function (event) {
        event.preventDefault();
        thisProduct.processOrder(); // ensure priceSingle is fresh
        thisProduct.addToCart(); // now emits event
      });
    }

    initAmountWidget() {
      const thisProduct = this;

      thisProduct.amountWidget = new AmountWidget(
        thisProduct.dom.amountWidgetElem
      );

      thisProduct.dom.amountWidgetElem.addEventListener(
        'updated',
        function () {
          thisProduct.processOrder();
        }
      );
    }

    processOrder() {
      const thisProduct = this;

      // Read form data as object
      const formData = utils.serializeFormToObject(thisProduct.dom.form);

      // Start from base price
      let price = thisProduct.data.price;

      // Loop over params/options
      for (let paramId in thisProduct.data.params) {
        const param = thisProduct.data.params[paramId];

        for (let optionId in param.options) {
          const option = param.options[optionId];

          // Is option selected?
          const optionSelected =
            formData[paramId] && formData[paramId].includes(optionId);

          // Price delta
          if (optionSelected && !option.default) {
            price += option.price;
          } else if (!optionSelected && option.default) {
            price -= option.price;
          }

          // Toggle ingredient image
          const optionImage = thisProduct.dom.imageWrapper.querySelector(
            '.' + paramId + '-' + optionId
          );
          if (optionImage) {
            if (optionSelected) {
              optionImage.classList.add(classNames.menuProduct.imageVisible);
            } else {
              optionImage.classList.remove(classNames.menuProduct.imageVisible);
            }
          }
        }
      }

      // Save price of a single item (after options)
      thisProduct.priceSingle = price;

      // Multiply by chosen amount
      const amount =
        typeof thisProduct.amountWidget.value === 'number'
          ? thisProduct.amountWidget.value
          : settings.amountWidget.defaultValue;
      const total = price * amount;

      // Update DOM
      thisProduct.dom.priceElem.innerHTML = total;
    }

    prepareCartProduct() {
      const thisProduct = this;

      // Build object consumed by cart template
      const amount =
        typeof thisProduct.amountWidget.value === 'number'
          ? thisProduct.amountWidget.value
          : settings.amountWidget.defaultValue;

      return {
        id: thisProduct.id,
        name: thisProduct.data.name,
        amount: amount,
        priceSingle: thisProduct.priceSingle,
        price: thisProduct.priceSingle * amount,
        params: thisProduct.prepareCartProductParams(),
      };
    }

    prepareCartProductParams() {
      const thisProduct = this;

      const formData = utils.serializeFormToObject(thisProduct.dom.form);
      const params = {};

      // Build params with labels for chosen options
      for (let paramId in thisProduct.data.params) {
        const param = thisProduct.data.params[paramId];

        // Create param bucket
        params[paramId] = {
          label: param.label,
          options: {},
        };

        for (let optionId in param.options) {
          const option = param.options[optionId];
          const optionSelected =
            formData[paramId] && formData[paramId].includes(optionId);

          if (optionSelected) {
            params[paramId].options[optionId] = option.label;
          }
        }

        // Remove empty param groups
        if (Object.keys(params[paramId].options).length === 0) {
          delete params[paramId];
        }
      }

      return params;
    }

    // === CHANGED: emit event instead of calling cart directly ===
    addToCart() {
      const thisProduct = this;

      const event = new CustomEvent('add-to-cart', {
        bubbles: true,
        detail: {
          product: thisProduct.prepareCartProduct(),
        },
      });
      thisProduct.dom.wrapper.dispatchEvent(event);
    }
  }

  // =========================
  // AmountWidget
  // =========================
  class AmountWidget {
    constructor(element) {
      const thisWidget = this;

      thisWidget.getElements(element);

      // Initialize starting value
      if (thisWidget.input.value) {
        thisWidget.setValue(thisWidget.input.value);
      } else {
        thisWidget.setValue(settings.amountWidget.defaultValue);
      }

      thisWidget.initActions();
    }

    getElements(element) {
      const thisWidget = this;

      thisWidget.element = element;
      thisWidget.input = thisWidget.element.querySelector(
        select.widgets.amount.input
      );
      thisWidget.linkDecrease = thisWidget.element.querySelector(
        select.widgets.amount.linkDecrease
      );
      thisWidget.linkIncrease = thisWidget.element.querySelector(
        select.widgets.amount.linkIncrease
      );
    }

    setValue(value) {
      const thisWidget = this;
      const newValue = parseInt(value);

      // Validate: changed, numeric, within range
      if (
        thisWidget.value !== newValue &&
        !isNaN(newValue) &&
        newValue >= settings.amountWidget.defaultMin &&
        newValue <= settings.amountWidget.defaultMax
      ) {
        thisWidget.value = newValue;
        thisWidget.announce();
      }

      // Reflect to input
      thisWidget.input.value =
        typeof thisWidget.value === 'number'
          ? thisWidget.value
          : settings.amountWidget.defaultValue;
    }

    announce() {
      const thisWidget = this;
      // CustomEvent with bubbling so Cart can listen high on the tree
      const event = new CustomEvent('updated', { bubbles: true });
      thisWidget.element.dispatchEvent(event);
    }

    initActions() {
      const thisWidget = this;

      thisWidget.input.addEventListener('change', function () {
        thisWidget.setValue(thisWidget.input.value);
      });

      thisWidget.linkDecrease.addEventListener('click', function (event) {
        event.preventDefault();
        const current =
          typeof thisWidget.value === 'number'
            ? thisWidget.value
            : settings.amountWidget.defaultValue;
        thisWidget.setValue(current - 1);
      });

      thisWidget.linkIncrease.addEventListener('click', function (event) {
        event.preventDefault();
        const current =
          typeof thisWidget.value === 'number'
            ? thisWidget.value
            : settings.amountWidget.defaultValue;
        thisWidget.setValue(current + 1);
      });
    }
  }

  // =========================
  // Cart
  // =========================
  class Cart {
    constructor(element) {
      const thisCart = this;

      thisCart.products = [];
      thisCart.getElements(element);
      thisCart.initActions();
    }

    getElements(element) {
      const thisCart = this;

      thisCart.dom = {};
      thisCart.dom.wrapper = element;
      thisCart.dom.toggleTrigger = thisCart.dom.wrapper.querySelector(
        select.cart.toggleTrigger
      );
      thisCart.dom.productList = thisCart.dom.wrapper.querySelector(
        select.cart.productList
      );
      thisCart.dom.deliveryFee = thisCart.dom.wrapper.querySelector(
        select.cart.deliveryFee
      );
      thisCart.dom.subtotalPrice = thisCart.dom.wrapper.querySelector(
        select.cart.subtotalPrice
      );
      thisCart.dom.totalNumber = thisCart.dom.wrapper.querySelector(
        select.cart.totalNumber
      );
      thisCart.dom.totalPrice = thisCart.dom.wrapper.querySelectorAll(
        select.cart.totalPrice
      );

      // (optional) form refs if you're sending orders later:
      thisCart.dom.form = thisCart.dom.wrapper.querySelector(select.cart.form);
      thisCart.dom.address =
        thisCart.dom.wrapper.querySelector(select.cart.address) ||
        thisCart.dom.wrapper.querySelector(select.cart.phone) /* fallback */;
      thisCart.dom.phone =
        thisCart.dom.wrapper.querySelector(select.cart.phone) ||
        thisCart.dom.wrapper.querySelector(select.cart.address) /* fallback */;
    }

    initActions() {
      const thisCart = this;

      // Show/hide cart panel
      thisCart.dom.toggleTrigger.addEventListener('click', function () {
        thisCart.dom.wrapper.classList.toggle(classNames.cart.wrapperActive);
      });

      // Recalculate totals when any product amount changes (event bubbles)
      thisCart.dom.productList.addEventListener('updated', function () {
        thisCart.update();
      });

      // React to remove requests from CartProduct instances
      thisCart.dom.productList.addEventListener('remove', function (event) {
        thisCart.remove(event.detail.cartProduct);
      });
    }

    add(menuProduct) {
      const thisCart = this;

      // 1) Render cart row from template
      const generatedHTML = templates.cartProduct(menuProduct);

      // 2) Convert HTML string to DOM node
      const generatedDOM = utils.createDOMFromHTML(generatedHTML);

      // 3) Append to cart's product list
      thisCart.dom.productList.appendChild(generatedDOM);

      // 4) Create CartProduct instance and store it
      thisCart.products.push(new CartProduct(menuProduct, generatedDOM));

      // 5) Update cart totals
      thisCart.update();
    }

    update() {
      const thisCart = this;

      const deliveryFee = settings.cart.defaultDeliveryFee;
      let totalNumber = 0;
      let subtotalPrice = 0;

      // Sum amounts & prices from products
      for (let cartProduct of thisCart.products) {
        totalNumber += cartProduct.amount;
        subtotalPrice += cartProduct.price;
      }

      // Compute totalPrice (no delivery when empty cart)
      if (thisCart.products.length === 0) {
        thisCart.totalPrice = 0;
      } else {
        thisCart.totalPrice = subtotalPrice + deliveryFee;
      }

      // Update DOM numbers
      thisCart.dom.totalNumber.innerHTML = totalNumber;
      thisCart.dom.subtotalPrice.innerHTML = subtotalPrice;

      // Delivery fee shown as 0 when cart empty
      thisCart.dom.deliveryFee.innerHTML =
        thisCart.products.length === 0 ? 0 : deliveryFee;

      // total price appears in two places
      for (let elem of thisCart.dom.totalPrice) {
        elem.innerHTML = thisCart.totalPrice;
      }
    }

    remove(cartProductInstance) {
      const thisCart = this;

      // 1) Remove DOM
      cartProductInstance.dom.wrapper.remove();

      // 2) Remove from internal array
      const index = thisCart.products.indexOf(cartProductInstance);
      if (index !== -1) {
        thisCart.products.splice(index, 1);
      }

      // 3) Recompute totals
      thisCart.update();
    }
  }

  // =========================
  // CartProduct
  // =========================
  class CartProduct {
    constructor(menuProduct, element) {
      const thisCartProduct = this;

      // Copy essential data for convenience
      thisCartProduct.id = menuProduct.id;
      thisCartProduct.name = menuProduct.name;
      thisCartProduct.amount = menuProduct.amount;
      thisCartProduct.priceSingle = menuProduct.priceSingle;
      thisCartProduct.price = menuProduct.price;
      thisCartProduct.params = menuProduct.params;

      thisCartProduct.getElements(element);
      thisCartProduct.initAmountWidget();
      thisCartProduct.initActions();
    }

    getElements(element) {
      const thisCartProduct = this;

      thisCartProduct.dom = {};
      thisCartProduct.dom.wrapper = element;
      thisCartProduct.dom.amountWidget =
        thisCartProduct.dom.wrapper.querySelector(select.cartProduct.amountWidget);
      thisCartProduct.dom.price =
        thisCartProduct.dom.wrapper.querySelector(select.cartProduct.price);
      thisCartProduct.dom.edit =
        thisCartProduct.dom.wrapper.querySelector(select.cartProduct.edit);
      thisCartProduct.dom.remove =
        thisCartProduct.dom.wrapper.querySelector(select.cartProduct.remove);
    }

    initAmountWidget() {
      const thisCartProduct = this;

      thisCartProduct.amountWidget = new AmountWidget(
        thisCartProduct.dom.amountWidget
      );

      thisCartProduct.dom.amountWidget.addEventListener('updated', function () {
        // Update amount & price for this cart row
        const currentAmount =
          typeof thisCartProduct.amountWidget.value === 'number'
            ? thisCartProduct.amountWidget.value
            : settings.amountWidget.defaultValue;

        thisCartProduct.amount = currentAmount;
        thisCartProduct.price = thisCartProduct.priceSingle * currentAmount;

        // Reflect in DOM
        thisCartProduct.dom.price.innerHTML = thisCartProduct.price;

        // Let Cart know something changed (bubbles up)
        const event = new CustomEvent('updated', { bubbles: true });
        thisCartProduct.dom.wrapper.dispatchEvent(event);
      });
    }

    initActions() {
      const thisCartProduct = this;

      // (Edit button reserved for future use)
      thisCartProduct.dom.edit.addEventListener('click', function (event) {
        event.preventDefault();
      });

      // Remove this product from cart
      thisCartProduct.dom.remove.addEventListener('click', function (event) {
        event.preventDefault();
        thisCartProduct.remove();
      });
    }

    remove() {
      const thisCartProduct = this;
      // Emit custom "remove" event with reference to this instance
      const event = new CustomEvent('remove', {
        bubbles: true,
        detail: {
          cartProduct: thisCartProduct,
        },
      });
      thisCartProduct.dom.wrapper.dispatchEvent(event);
    }
  }

  // =========================
  // App
  // =========================
  const app = {
    data: {},

    initData: function () {
      const thisApp = this;

      // Reset data container; we'll fill it from API
      thisApp.data = {};

      // Build products endpoint URL
      const url = settings.db.url + '/' + settings.db.products;

      // Fetch products from API
      fetch(url)
        .then(function (rawResponse) {
          return rawResponse.json();
        })
        .then(function (parsedResponse) {
          // Place products array under data.products
          thisApp.data.products = parsedResponse;

          // Now that we have products, render menu
          thisApp.initMenu();
        });
    },

    initMenu: function () {
      const thisApp = this;

      // Render each product (note: now each has .id property from API)
      for (let i = 0; i < thisApp.data.products.length; i++) {
        const productData = thisApp.data.products[i];
        new Product(productData.id, productData);
      }
    },

    initCart: function () {
      const thisApp = this;

      const cartElem = document.querySelector(select.containerOf.cart);
      thisApp.cart = new Cart(cartElem);

      // === NEW: listen for "add-to-cart" bubbling from products ===
      const menuContainer = document.querySelector(select.containerOf.menu);
      menuContainer.addEventListener('add-to-cart', function (event) {
        const product = event.detail.product;
        console.log('[add-to-cart] received:', product); // DEBUG: visible in Console
        thisApp.cart.add(product);
      });
    },

    init: function () {
      const thisApp = this;

      thisApp.initData(); // fetch + then render menu
      thisApp.initCart();
    },
  };

  // Expose app to window (optional)
  window.app = app;

  app.init();
}









































































