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

      // 1) render product HTML and insert into the DOM
      thisProduct.renderInMenu();

      // 2) cache frequently used DOM elements inside this instance
      thisProduct.getElements();

      // 3) set up accordion behavior
      thisProduct.initAccordion();

      // 4) set up order form listeners
      thisProduct.initOrderForm();

      // 5) create and wire up amount widget
      thisProduct.initAmountWidget();

      // 6) initial processing of order (price & images)
      thisProduct.processOrder();
    }

    renderInMenu() {
      const thisProduct = this;

      // Generate HTML code based on template
      const generatedHTML = templates.menuProduct(thisProduct.data);

      // Create DOM element from generated HTML
      thisProduct.element = utils.createDOMFromHTML(generatedHTML);

      // Find menu container on the page
      const menuContainer = document.querySelector(select.containerOf.menu);

      // Append newly created element to menu container
      menuContainer.appendChild(thisProduct.element);
    }

    getElements() {
      const thisProduct = this;

      // Store references to important DOM nodes inside the product
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

      // Listen for clicks on the product header
      thisProduct.accordionTrigger.addEventListener('click', function (event) {
        event.preventDefault();

        // Find currently active product (if any)
        const activeProduct = document.querySelector(
          select.all.menuProductsActive
        );

        // If there is an active product and it's not this one, close it
        if (activeProduct && activeProduct !== thisProduct.element) {
          activeProduct.classList.remove(classNames.menuProduct.wrapperActive);
        }

        // Toggle this product
        thisProduct.element.classList.toggle(
          classNames.menuProduct.wrapperActive
        );
      });
    }

    initOrderForm() {
      const thisProduct = this;

      // Handle form submit (Enter key)
      thisProduct.form.addEventListener('submit', function (event) {
        event.preventDefault();
        thisProduct.processOrder();
      });

      // Handle any change in form inputs
      for (let input of thisProduct.formInputs) {
        input.addEventListener('change', function () {
          thisProduct.processOrder();
        });
      }

      // Handle "Add to cart" button click
      thisProduct.cartButton.addEventListener('click', function (event) {
        event.preventDefault();
        thisProduct.processOrder();
      });
    }

    initAmountWidget() {
      const thisProduct = this;

      // create new AmountWidget instance and keep a reference to it
      thisProduct.amountWidget = new AmountWidget(thisProduct.amountWidgetElem);
    }

    processOrder() {
      const thisProduct = this;

      // Convert form data into an object
      const formData = utils.serializeFormToObject(thisProduct.form);

      // Start from base price
      let price = thisProduct.data.price;

      // Iterate over all product parameters
      for (let paramId in thisProduct.data.params) {
        const param = thisProduct.data.params[paramId];

        // Iterate over options within each parameter
        for (let optionId in param.options) {
          const option = param.options[optionId];

          // Is this option selected in the form?
          const optionSelected =
            formData[paramId] && formData[paramId].includes(optionId);

          // Adjust price based on selection and defaults
          if (optionSelected && !option.default) {
            price += option.price;
          } else if (!optionSelected && option.default) {
            price -= option.price;
          }

          // Find image representing this param-option pair
          const optionImage = thisProduct.imageWrapper.querySelector(
            '.' + paramId + '-' + optionId
          );

          // Show/hide image based on selection
          if (optionImage) {
            if (optionSelected) {
              optionImage.classList.add(classNames.menuProduct.imageVisible);
            } else {
              optionImage.classList.remove(classNames.menuProduct.imageVisible);
            }
          }
        }
      }

      // Update price in the DOM (note: quantity multiplication will come later)
      thisProduct.priceElem.innerHTML = price;
    }
  }

  class AmountWidget {
    constructor(element) {
      const thisWidget = this;

      // Find and store widget elements
      thisWidget.getElements(element);

      // Debug logs (możesz zakomentować, gdy przetestujesz)
      console.log('AmountWidget:', thisWidget);
      console.log('constructor arguments:', element);
    }

    // Find input and +/- controls inside the widget wrapper
    getElements(element) {
      const thisWidget = this;

      // Save wrapper element
      thisWidget.element = element;

      // Find input inside widget
      thisWidget.input = thisWidget.element.querySelector(
        select.widgets.amount.input
      );

      // Find "decrease" and "increase" links
      thisWidget.linkDecrease = thisWidget.element.querySelector(
        select.widgets.amount.linkDecrease
      );
      thisWidget.linkIncrease = thisWidget.element.querySelector(
        select.widgets.amount.linkIncrease
      );
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





















