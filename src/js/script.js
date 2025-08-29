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

      // 1) render product and insert it into DOM
      thisProduct.renderInMenu();

      // 2) store frequently used DOM elements
      thisProduct.getElements();

      // 3) initialize accordion behavior
      thisProduct.initAccordion();

      // 4) set up order form listeners
      thisProduct.initOrderForm();

      // 5) initialize amount widget
      thisProduct.initAmountWidget();

      // 6) initial price and images update
      thisProduct.processOrder();
    }

    renderInMenu() {
      const thisProduct = this;

      // generate HTML from template
      const generatedHTML = templates.menuProduct(thisProduct.data);

      // create DOM element
      thisProduct.element = utils.createDOMFromHTML(generatedHTML);

      // find menu container
      const menuContainer = document.querySelector(select.containerOf.menu);

      // append element to menu
      menuContainer.appendChild(thisProduct.element);
    }

    getElements() {
      const thisProduct = this;

      // references to important DOM nodes
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

      // toggle product visibility when clicking on header
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

      // prevent page reload on form submit
      thisProduct.form.addEventListener('submit', function (event) {
        event.preventDefault();
        thisProduct.processOrder();
      });

      // recalculate price on any input change
      for (let input of thisProduct.formInputs) {
        input.addEventListener('change', function () {
          thisProduct.processOrder();
        });
      }

      // recalculate price on "Add to cart" click
      thisProduct.cartButton.addEventListener('click', function (event) {
        event.preventDefault();
        thisProduct.processOrder();
      });
    }

    initAmountWidget() {
      const thisProduct = this;

      // create AmountWidget instance
      thisProduct.amountWidget = new AmountWidget(thisProduct.amountWidgetElem);
    }

    processOrder() {
      const thisProduct = this;

      // read form values into object
      const formData = utils.serializeFormToObject(thisProduct.form);

      // start from default price
      let price = thisProduct.data.price;

      // iterate over all product params
      for (let paramId in thisProduct.data.params) {
        const param = thisProduct.data.params[paramId];

        // iterate over all options of a given param
        for (let optionId in param.options) {
          const option = param.options[optionId];

          // check if option is selected
          const optionSelected =
            formData[paramId] && formData[paramId].includes(optionId);

          // modify price depending on selection
          if (optionSelected && !option.default) {
            price += option.price;
          } else if (!optionSelected && option.default) {
            price -= option.price;
          }

          // toggle ingredient images
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

      // update DOM with new price
      thisProduct.priceElem.innerHTML = price;
    }
  }

  class AmountWidget {
    constructor(element) {
      const thisWidget = this;

      // get references to widget DOM elements
      thisWidget.getElements(element);

      // set initial value from input
      thisWidget.setValue(thisWidget.input.value);
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

      // convert to number
      const newValue = parseInt(value);

      /* validation:
         - must be a number (not NaN)
         - must be different from current value */
      if (thisWidget.value !== newValue && !isNaN(newValue)) {
        thisWidget.value = newValue;
      }

      // update input field (reverts to previous valid value if wrong input)
      thisWidget.input.value = thisWidget.value;
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






















