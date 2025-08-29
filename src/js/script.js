/* global Handlebars, utils, dataSource */ // eslint-disable-line no-unused-vars

{
  'use strict';

  const select = {
    templateOf: {
      menuProduct: '#template-menu-product',
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
        input: 'input[name="amount"]',
        linkDecrease: 'a[href="#less"]',
        linkIncrease: 'a[href="#more"]',
      },
    },
  };

  const classNames = {
    menuProduct: {
      wrapperActive: 'active',
      imageVisible: 'active',
    },
  };

  const settings = {
    amountWidget: {
      defaultValue: 1,
      defaultMin: 0,
      defaultMax: 10,
    },
  };

  const templates = {
    menuProduct: Handlebars.compile(
      document.querySelector(select.templateOf.menuProduct).innerHTML
    ),
  };

  class Product {
    constructor(id, data) {
      const thisProduct = this;

      thisProduct.id = id;
      thisProduct.data = data;

      // 1) render product and insert into DOM
      thisProduct.renderInMenu();

      // 2) cache frequently used DOM elements
      thisProduct.getElements();

      // 3) set up accordion behavior
      thisProduct.initAccordion();

      // 4) set up order form listeners
      thisProduct.initOrderForm();

      // 5) init amount widget
      thisProduct.initAmountWidget();

      // 6) initial price calculation
      thisProduct.processOrder();
    }

    renderInMenu() {
      const thisProduct = this;

      // Generate HTML based on Handlebars template
      const generatedHTML = templates.menuProduct(thisProduct.data);

      // Create DOM element from HTML
      thisProduct.element = utils.createDOMFromHTML(generatedHTML);

      // Append to menu container
      const menuContainer = document.querySelector(select.containerOf.menu);
      menuContainer.appendChild(thisProduct.element);
    }

    getElements() {
      const thisProduct = this;

      // Cache nodes inside product
      thisProduct.accordionTrigger =
        thisProduct.element.querySelector(select.menuProduct.clickable);
      thisProduct.form =
        thisProduct.element.querySelector(select.menuProduct.form);
      thisProduct.formInputs =
        thisProduct.form.querySelectorAll(select.all.formInputs);
      thisProduct.cartButton =
        thisProduct.element.querySelector(select.menuProduct.cartButton);
      thisProduct.priceElem =
        thisProduct.element.querySelector(select.menuProduct.priceElem);
      thisProduct.imageWrapper =
        thisProduct.element.querySelector(select.menuProduct.imageWrapper);
      thisProduct.amountWidgetElem =
        thisProduct.element.querySelector(select.menuProduct.amountWidget);
    }

    initAccordion() {
      const thisProduct = this;

      // Toggle current product; close previously opened one
      thisProduct.accordionTrigger.addEventListener('click', function (event) {
        event.preventDefault();

        const activeProduct = document.querySelector(
          select.all.menuProductsActive
        );

        if (activeProduct && activeProduct !== thisProduct.element) {
          activeProduct.classList.remove(classNames.menuProduct.wrapperActive);
        }

        thisProduct.element.classList.toggle(
          classNames.menuProduct.wrapperActive
        );
      });
    }

    initOrderForm() {
      const thisProduct = this;

      // Recalculate on submit (prevent form navigation)
      thisProduct.form.addEventListener('submit', function (event) {
        event.preventDefault();
        thisProduct.processOrder();
      });

      // Recalculate on any input change
      for (let input of thisProduct.formInputs) {
        input.addEventListener('change', function () {
          thisProduct.processOrder();
        });
      }

      // Recalculate on "Add to cart" click (later will also add to cart)
      thisProduct.cartButton.addEventListener('click', function (event) {
        event.preventDefault();
        thisProduct.processOrder();
      });
    }

    initAmountWidget() {
      const thisProduct = this;
      thisProduct.amountWidget = new AmountWidget(thisProduct.amountWidgetElem);
    }

    processOrder() {
      const thisProduct = this;

      // Read form into plain object, e.g. { sauce: ['tomato'], toppings: ['olives'] }
      const formData = utils.serializeFormToObject(thisProduct.form);

      // Start from base price
      let price = thisProduct.data.price;

      // Iterate over params and options
      for (let paramId in thisProduct.data.params) {
        const param = thisProduct.data.params[paramId];

        for (let optionId in param.options) {
          const option = param.options[optionId];

          // Is this option selected in the form?
          const optionSelected =
            formData[paramId] && formData[paramId].includes(optionId);

          // Adjust price vs default
          if (optionSelected && !option.default) {
            price += option.price;
          } else if (!optionSelected && option.default) {
            price -= option.price;
          }

          // Toggle ingredient image visibility (if exists)
          const optionImage = thisProduct.imageWrapper.querySelector(
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

      // Update visible price (base price only; amount multiplication comes later)
      thisProduct.priceElem.innerHTML = price;
    }
  }

  class AmountWidget {
    constructor(element) {
      const thisWidget = this;

      // Grab DOM elements
      thisWidget.getElements(element);

      // Initialize internal value from input
      thisWidget.setValue(thisWidget.input.value);

      // Set up listeners
      thisWidget.initActions();
    }

    getElements(element) {
      const thisWidget = this;

      thisWidget.element = element;
      thisWidget.input =
        thisWidget.element.querySelector(select.widgets.amount.input);
      thisWidget.linkDecrease =
        thisWidget.element.querySelector(select.widgets.amount.linkDecrease);
      thisWidget.linkIncrease =
        thisWidget.element.querySelector(select.widgets.amount.linkIncrease);
    }

    setValue(value) {
      const thisWidget = this;

      const newValue = parseInt(value);

      // Accept only different, numeric, and in-range values
      if (
        thisWidget.value !== newValue &&
        !isNaN(newValue) &&
        newValue >= settings.amountWidget.defaultMin &&
        newValue <= settings.amountWidget.defaultMax
      ) {
        thisWidget.value = newValue;
      }

      // Reflect current value in the input
      thisWidget.input.value = thisWidget.value;
    }

    initActions() {
      const thisWidget = this;

      // Manual input change
      thisWidget.input.addEventListener('change', function () {
        thisWidget.setValue(thisWidget.input.value);
      });

      // Decrease button
      thisWidget.linkDecrease.addEventListener('click', function (event) {
        event.preventDefault();
        thisWidget.setValue(thisWidget.value - 1);
      });

      // Increase button
      thisWidget.linkIncrease.addEventListener('click', function (event) {
        event.preventDefault();
        thisWidget.setValue(thisWidget.value + 1);
      });
    }
  }

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

    init: function () {
      const thisApp = this;
      thisApp.initData();
      thisApp.initMenu();
    },
  };

  app.init();
}
























