/* global Handlebars, utils, dataSource */ // eslint-disable-line no-unused-vars

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
        input: 'input.amount',
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
        thisProduct.addToCart(); // push to cart
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

      // Save single item price (after options)
      thisProduct.priceSingle = price;

      // Multiply by chosen amount
      const amount = thisProduct.amountWidget.value;
      const total = price * amount;

      // Update DOM
      thisProduct.dom.priceElem.innerHTML = total;
    }

    prepareCartProduct() {
      const thisProduct = this;

      // Build object consumed by cart template
      const productSummary = {
        id: thisProduct.id,
        name: thisProduct.data.name,
        amount: thisProduct.amountWidget.value,
        priceSingle: thisProduct.priceSingle,
        price: thisProduct.priceSingle * thisProduct.amountWidget.value,
        params: thisProduct.prepareCartProductParams(),
      };

      return productSummary;
    }

    prepareCartProductParams() {
      const thisProduct = this;

      const formData = utils.serializeFormToObject(thisProduct.dom.form);
      const params = {};

      // Build params with labels for chosen options
      for (let paramId in thisProduct.data.params) {
        const param = thisProduct.data.params[paramId];

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

        // Remove empty param
        if (Object.keys(params[paramId].options).length === 0) {
          delete params[paramId];
        }
      }

      return params;
    }

    addToCart() {
      const thisProduct = this;

      // Send product summary to the cart instance
      app.cart.add(thisProduct.prepareCartProduct());
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
      // CustomEvent with bubbling so Cart can listen on the list container
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
  // Cart (show/hide + add + totals)
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

      // Totals area
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
    }

    initActions() {
      const thisCart = this;

      // Show/hide cart panel
      thisCart.dom.toggleTrigger.addEventListener('click', function () {
        thisCart.dom.wrapper.classList.toggle(classNames.cart.wrapperActive);
      });

      // Recompute totals when any product's quantity changes (event bubbles)
      thisCart.dom.productList.addEventListener('updated', function () {
        thisCart.update();
      });

      // Catch remove events from CartProduct (event bubbles with detail)
      thisCart.dom.productList.addEventListener('remove', function (event) {
        thisCart.remove(event.detail.cartProduct);
      });
    }

    add(menuProduct) {
      const thisCart = this;

      // Render cart row from template
      const generatedHTML = templates.cartProduct(menuProduct);
      const generatedDOM = utils.createDOMFromHTML(generatedHTML);

      // Append to list
      thisCart.dom.productList.appendChild(generatedDOM);

      // Create CartProduct instance and store it in the cart
      thisCart.products.push(new CartProduct(menuProduct, generatedDOM));

      // Update totals
      thisCart.update();
    }

    update() {
      const thisCart = this;

      const deliveryFee = settings.cart.defaultDeliveryFee;
      let totalNumber = 0;
      let subtotalPrice = 0;

      // Sum amounts and subtotals from CartProduct instances
      for (let cartProduct of thisCart.products) {
        totalNumber += cartProduct.amount;
        subtotalPrice += cartProduct.price;
      }

      // Compute total price (with delivery only if there are items)
      if (totalNumber > 0) {
        thisCart.totalPrice = subtotalPrice + deliveryFee;
      } else {
        thisCart.totalPrice = 0;
      }

      // Update DOM: number of items
      thisCart.dom.totalNumber.innerHTML = totalNumber;

      // Update DOM: delivery fee (0 if cart empty)
      thisCart.dom.deliveryFee.innerHTML = totalNumber > 0 ? deliveryFee : 0;

      // Update DOM: subtotal
      thisCart.dom.subtotalPrice.innerHTML = subtotalPrice;

      // Update DOM: total (there are two targets)
      for (let totalElem of thisCart.dom.totalPrice) {
        totalElem.innerHTML = thisCart.totalPrice;
      }
    }

    remove(cartProduct) {
      const thisCart = this;

      // 1) Remove DOM representation
      cartProduct.dom.wrapper.remove();

      // 2) Remove from array
      const index = thisCart.products.indexOf(cartProduct);
      if (index !== -1) {
        thisCart.products.splice(index, 1);
      }

      // 3) Recalculate totals
      thisCart.update();
    }
  }

  // =========================
  // CartProduct (single row in cart)
  // =========================
  class CartProduct {
    constructor(menuProduct, element) {
      const thisCartProduct = this;

      // Copy essential data for easier access
      thisCartProduct.id = menuProduct.id;
      thisCartProduct.name = menuProduct.name;
      thisCartProduct.amount = menuProduct.amount;
      thisCartProduct.priceSingle = menuProduct.priceSingle;
      thisCartProduct.price = menuProduct.price;
      thisCartProduct.params = menuProduct.params;

      // Cache DOM and init behaviors
      thisCartProduct.getElements(element);
      thisCartProduct.initAmountWidget();
      thisCartProduct.initActions();
    }

    getElements(element) {
      const thisCartProduct = this;

      thisCartProduct.dom = {};
      thisCartProduct.dom.wrapper = element;
      thisCartProduct.dom.amountWidget =
        thisCartProduct.dom.wrapper.querySelector(
          select.cartProduct.amountWidget
        );
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

      // When AmountWidget updates, recalc own amount & price and update DOM
      thisCartProduct.dom.amountWidget.addEventListener('updated', function () {
        thisCartProduct.amount = thisCartProduct.amountWidget.value;
        thisCartProduct.price =
          thisCartProduct.priceSingle * thisCartProduct.amount;
        thisCartProduct.dom.price.innerHTML = thisCartProduct.price;
      });
    }

    initActions() {
      const thisCartProduct = this;

      // Edit is not implemented yet; prevent default for consistency
      thisCartProduct.dom.edit.addEventListener('click', function (event) {
        event.preventDefault();
      });

      // Remove row from cart
      thisCartProduct.dom.remove.addEventListener('click', function (event) {
        event.preventDefault();
        thisCartProduct.remove();
      });
    }

    remove() {
      const thisCartProduct = this;
      // Emit custom 'remove' event with bubbling and a detail payload
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
    initData: function () {
      const thisApp = this;
      thisApp.data = dataSource;
    },

    initMenu: function () {
      const thisApp = this;

      for (let productId in thisApp.data.products) {
        new Product(productId, thisApp.data.products[productId]);
      }
    },

    initCart: function () {
      const thisApp = this;

      const cartElem = document.querySelector(select.containerOf.cart);
      thisApp.cart = new Cart(cartElem);
    },

    init: function () {
      const thisApp = this;

      thisApp.initData();
      thisApp.initMenu();
      thisApp.initCart();
    },
  };

  app.init();
}



































































