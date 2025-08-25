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

      // 4) set up order form listeners (skeleton for now)
      thisProduct.initOrderForm();

      // 5) compute price / react to options (skeleton for now)
      thisProduct.processOrder();

      console.log('new Product:', thisProduct);
    }

    renderInMenu() {
      const thisProduct = this;

      // 1. generate HTML code based on template
      const generatedHTML = templates.menuProduct(thisProduct.data);

      // 2. create DOM element from generated HTML
      thisProduct.element = utils.createDOMFromHTML(generatedHTML);

      // 3. find menu container on the page
      const menuContainer = document.querySelector(select.containerOf.menu);

      // 4. append newly created element to menu container
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

      // For now: just a debug log to confirm method is called per product
      console.log('initOrderForm for:', thisProduct.id);
      // (Next steps will add event listeners for form changes & submit)
    }

    processOrder() {
      const thisProduct = this;

      // For now: just a debug log to confirm method is called per product
      console.log('processOrder for:', thisProduct.id);
      // (Next steps will compute price based on selected options)
    }
  }

  const app = {
    initData: function () {
      const thisApp = this;
      thisApp.data = dataSource;
    },

    initMenu: function () {
      const thisApp = this;

      console.log('app.initMenu');
      console.log('thisApp.data:', thisApp.data);

      for (let productId in thisApp.data.products) {
        new Product(productId, thisApp.data.products[productId]);
      }
    },

    init: function () {
      const thisApp = this;
      console.log('*** App starting ***');
      console.log('thisApp:', thisApp);
      console.log('classNames:', classNames);
      console.log('settings:', settings);
      console.log('templates:', templates);

      thisApp.initData();
      thisApp.initMenu();
    },
  };

  app.init();
}








