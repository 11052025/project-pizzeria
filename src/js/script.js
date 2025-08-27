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
      imageVisible: 'active', // class used to show an ingredient image
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

      // 1) Render product in menu
      thisProduct.renderInMenu();

      // 2) Get references to DOM elements
      thisProduct.getElements();

      // 3) Initialize accordion
      thisProduct.initAccordion();

      // 4) Set listeners on form
      thisProduct.initOrderForm();

      // 5) Calculate initial price (and set initial images visibility)
      thisProduct.processOrder();

      console.log('new Product:', thisProduct);
    }

    renderInMenu() {
      const thisProduct = this;

      // Generate HTML using Handlebars template
      const generatedHTML = templates.menuProduct(thisProduct.data);

      // Create DOM element
      thisProduct.element = utils.createDOMFromHTML(generatedHTML);

      // Find menu container and append product element
      const menuContainer = document.querySelector(select.containerOf.menu);
      menuContainer.appendChild(thisProduct.element);
    }

    getElements() {
      const thisProduct = this;

      // References to important DOM elements inside product
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
        thisProduct.element.querySelector(select.menuProduct.imageWrapper); // wrapper that contains ingredient images
    }

    initAccordion() {
      const thisProduct = this;

      // Add listener to product header
      thisProduct.accordionTrigger.addEventListener('click', function (event) {
        event.preventDefault();

        // Close other active product
        const activeProduct = document.querySelector(
          select.all.menuProductsActive
        );
        if (activeProduct && activeProduct !== thisProduct.element) {
          activeProduct.classList.remove(classNames.menuProduct.wrapperActive);
        }

        // Toggle current product
        thisProduct.element.classList.toggle(
          classNames.menuProduct.wrapperActive
        );
      });
    }

    initOrderForm() {
      const thisProduct = this;

      // Submit form
      thisProduct.form.addEventListener('submit', function (event) {
        event.preventDefault();
        thisProduct.processOrder();
      });

      // Change any input
      for (let input of thisProduct.formInputs) {
        input.addEventListener('change', function () {
          thisProduct.processOrder();
        });
      }

      // Add to cart button
      thisProduct.cartButton.addEventListener('click', function (event) {
        event.preventDefault();
        thisProduct.processOrder();
      });
    }

    processOrder() {
      const thisProduct = this;

      // 1) Serialize form data to object
      const formData = utils.serializeFormToObject(thisProduct.form);
      console.log('formData:', formData);

      // 2) Start with base price
      let price = thisProduct.data.price;

      // 3) Loop through all params in product
      for (let paramId in thisProduct.data.params) {
        const param = thisProduct.data.params[paramId];

        // 4) Loop through all options of param
        for (let optionId in param.options) {
          const option = param.options[optionId];

          // 5) Check if option is selected in form
          const optionSelected =
            formData[paramId] && formData[paramId].includes(optionId);

          // 6) Price adjustments
          if (optionSelected && !option.default) {
            price += option.price;
          } else if (!optionSelected && option.default) {
            price -= option.price;
          }

          // 7) Toggle matching ingredient image visibility
          // Images have classes like ".toppings-olives", ".sauce-tomato"
          if (thisProduct.imageWrapper) {
            const imageSelector = '.' + paramId + '-' + optionId;
            const image = thisProduct.imageWrapper.querySelector(imageSelector);
            if (image) {
              if (optionSelected) {
                image.classList.add(classNames.menuProduct.imageVisible);
              } else {
                image.classList.remove(classNames.menuProduct.imageVisible);
              }
            }
          }
        }
      }

      // 8) Update price in DOM (next to Add to Cart button)
      thisProduct.priceElem.innerHTML = price;
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

















