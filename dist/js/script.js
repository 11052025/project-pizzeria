/* global Handlebars, utils, dataSource */ // eslint-disable-line no-unused-vars

{
  'use strict';

  const select = {
    templateOf: {
      menuProduct: '#template-menu-product',
      cartProduct: '#template-cart-product', // for cart items
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
        input: 'input.amount', // matches updated HTML (both product & cart)
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

  /* =========================
     Product
  ========================== */
  class Product {
    constructor(id, data) {
      const thisProduct = this;

      thisProduct.id = id;
      thisProduct.data = data;

      // 1) render product in DOM
      thisProduct.renderInMenu();

      // 2) cache DOM elements
      thisProduct.getElements();

      // 3) set accordion
      thisProduct.initAccordion();

      // 4) add listeners to form inputs and button
      thisProduct.initOrderForm();

      // 5) initialize amount widget and listen to its "updated"
      thisProduct.initAmountWidget();

      // 6) compute initial price
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

      thisProduct.form.addEventListener('submit', function (event) {
        event.preventDefault();
        thisProduct.processOrder();
      });

      for (let input of thisProduct.formInputs) {
        input.addEventListener('change', function () {
          thisProduct.processOrder();
        });
      }

      thisProduct.cartButton.addEventListener('click', function (event) {
        event.preventDefault();
        // recalc before add
        thisProduct.processOrder();
        // send to cart
        thisProduct.addToCart();
      });
    }

    initAmountWidget() {
      const thisProduct = this;

      thisProduct.amountWidget = new AmountWidget(thisProduct.amountWidgetElem);

      thisProduct.amountWidgetElem.addEventListener('updated', function () {
        thisProduct.processOrder();
      });
    }

    processOrder() {
      const thisProduct = this;

      const formData = utils.serializeFormToObject(thisProduct.form);

      let price = thisProduct.data.price;

      for (let paramId in thisProduct.data.params) {
        const param = thisProduct.data.params[paramId];

        for (let optionId in param.options) {
          const option = param.options[optionId];
          const optionSelected =
            formData[paramId] && formData[paramId].includes(optionId);

          if (optionSelected && !option.default) {
            price += option.price;
          } else if (!optionSelected && option.default) {
            price -= option.price;
          }

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

      // store single price (after options, before quantity)
      thisProduct.priceSingle = price;

      // total (after quantity)
      const total = price * thisProduct.amountWidget.value;
      thisProduct.priceCurrent = total;

      thisProduct.priceElem.innerHTML = total;
    }

    prepareCartProduct() {
      const thisProduct = this;
      const formData = utils.serializeFormToObject(thisProduct.form);

      // build params for the cart summary
      const params = {};
      for (let paramId in thisProduct.data.params) {
        const param = thisProduct.data.params[paramId];
        const paramBucket = {
          label: param.label,
          options: {},
        };

        for (let optionId in param.options) {
          const option = param.options[optionId];
          const selected =
            formData[paramId] && formData[paramId].includes(optionId);
          if (selected) {
            paramBucket.options[optionId] = option.label;
          }
        }

        if (Object.keys(paramBucket.options).length) {
          params[paramId] = paramBucket;
        }
      }

      return {
        id: thisProduct.id,
        name: thisProduct.data.name,
        amount: thisProduct.amountWidget.value,
        priceSingle: thisProduct.priceSingle,
        price: thisProduct.priceCurrent,
        params: params,
      };
    }

    addToCart() {
      const thisProduct = this;

      const productSummary = thisProduct.prepareCartProduct();

      const event = new CustomEvent('add-to-cart', {
        bubbles: true,
        detail: {
          product: productSummary,
        },
      });
      thisProduct.element.dispatchEvent(event);
    }
  }

  /* =========================
     AmountWidget
  ========================== */
  class AmountWidget {
    constructor(element) {
      const thisWidget = this;

      thisWidget.getElements(element);

      // set initial value (from input if present, otherwise default)
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

      const currentOrDefault =
        typeof thisWidget.value === 'number'
          ? thisWidget.value
          : settings.amountWidget.defaultValue;

      // validate and apply
      if (
        thisWidget.value !== newValue &&
        !isNaN(newValue) &&
        newValue >= settings.amountWidget.defaultMin &&
        newValue <= settings.amountWidget.defaultMax
      ) {
        thisWidget.value = newValue;
        thisWidget.announce();
      }

      thisWidget.input.value =
        typeof thisWidget.value === 'number'
          ? thisWidget.value
          : currentOrDefault;
    }

    announce() {
      const thisWidget = this;
      const event = new Event('updated');
      thisWidget.element.dispatchEvent(event);
    }

    initActions() {
      const thisWidget = this;

      thisWidget.input.addEventListener('change', function () {
        thisWidget.setValue(thisWidget.input.value);
      });

      thisWidget.linkDecrease.addEventListener('click', function (event) {
        event.preventDefault();
        const base =
          typeof thisWidget.value === 'number'
            ? thisWidget.value
            : settings.amountWidget.defaultValue;
        thisWidget.setValue(base - 1);
      });

      thisWidget.linkIncrease.addEventListener('click', function (event) {
        event.preventDefault();
        const base =
          typeof thisWidget.value === 'number'
            ? thisWidget.value
            : settings.amountWidget.defaultValue;
        thisWidget.setValue(base + 1);
      });
    }
  }

  /* =========================
     CartProduct (single line in cart)
  ========================== */
  class CartProduct {
    constructor(menuProduct, element) {
      const thisCartProduct = this;

      // copy base data from menuProduct summary
      thisCartProduct.id = menuProduct.id;
      thisCartProduct.name = menuProduct.name;
      thisCartProduct.amount = menuProduct.amount;
      thisCartProduct.priceSingle = menuProduct.priceSingle;
      thisCartProduct.price = menuProduct.price;
      thisCartProduct.params = menuProduct.params;

      thisCartProduct.getElements(element);
      thisCartProduct.initAmountWidget();
      thisCartProduct.initActions();
      thisCartProduct.renderPrice(); // ensure price text is in sync
    }

    getElements(element) {
      const thisCartProduct = this;

      thisCartProduct.dom = {};
      thisCartProduct.dom.wrapper = element;
      thisCartProduct.dom.amountWidget =
        element.querySelector(select.cartProduct.amountWidget);
      thisCartProduct.dom.price = element.querySelector(select.cartProduct.price);
      thisCartProduct.dom.edit = element.querySelector(select.cartProduct.edit);
      thisCartProduct.dom.remove =
        element.querySelector(select.cartProduct.remove);
    }

    initAmountWidget() {
      const thisCartProduct = this;

      thisCartProduct.amountWidget = new AmountWidget(
        thisCartProduct.dom.amountWidget
      );

      // when amount changes, update internal amount & price, then bubble event
      thisCartProduct.dom.amountWidget.addEventListener('updated', () => {
        thisCartProduct.amount = thisCartProduct.amountWidget.value;
        thisCartProduct.price =
          thisCartProduct.amount * thisCartProduct.priceSingle;
        thisCartProduct.renderPrice();

        // let the cart know totals may have changed
        const event = new Event('updated', { bubbles: true });
        thisCartProduct.dom.wrapper.dispatchEvent(event);
      });
    }

    renderPrice() {
      const thisCartProduct = this;
      if (thisCartProduct.dom.price) {
        thisCartProduct.dom.price.innerHTML = thisCartProduct.price;
      }
    }

    remove() {
      const thisCartProduct = this;

      // emit custom event with self reference
      const event = new CustomEvent('remove', {
        bubbles: true,
        detail: { cartProduct: thisCartProduct },
      });
      thisCartProduct.dom.wrapper.dispatchEvent(event);
    }

    initActions() {
      const thisCartProduct = this;

      // "Edit" is not implemented yet — prevent default only
      thisCartProduct.dom.edit.addEventListener('click', (e) => {
        e.preventDefault();
      });

      // Remove line from cart
      thisCartProduct.dom.remove.addEventListener('click', (e) => {
        e.preventDefault();
        thisCartProduct.remove();
      });
    }

    getData() {
      const thisCartProduct = this;
      return {
        id: thisCartProduct.id,
        name: thisCartProduct.name,
        amount: thisCartProduct.amount,
        priceSingle: thisCartProduct.priceSingle,
        price: thisCartProduct.price,
        params: thisCartProduct.params,
      };
    }
  }

  /* =========================
     Cart (container)
  ========================== */
  class Cart {
    constructor(element) {
      const thisCart = this;

      thisCart.products = []; // will store CartProduct instances
      thisCart.getElements(element);
      thisCart.initActions();
      thisCart.update(); // initial totals
    }

    getElements(element) {
      const thisCart = this;

      thisCart.dom = {};
      thisCart.dom.wrapper = element;
      thisCart.dom.toggleTrigger = element.querySelector(
        select.cart.toggleTrigger
      );
      thisCart.dom.productList = element.querySelector(
        select.cart.productList
      );
      thisCart.dom.totalNumber = element.querySelector(
        select.cart.totalNumber
      );
      thisCart.dom.totalPrice = element.querySelectorAll(select.cart.totalPrice);
      thisCart.dom.subtotalPrice = element.querySelector(
        select.cart.subtotalPrice
      );
      thisCart.dom.deliveryFee = element.querySelector(select.cart.deliveryFee);

      // form & fields for submitting order
      thisCart.dom.form = element.querySelector(select.cart.form);
      thisCart.dom.phone = element.querySelector(select.cart.phone);
      thisCart.dom.address = element.querySelector(select.cart.address);
    }

    initActions() {
      const thisCart = this;

      // open/close cart
      thisCart.dom.toggleTrigger.addEventListener('click', (e) => {
        e.preventDefault();
        thisCart.dom.wrapper.classList.toggle(classNames.cart.wrapperActive);
      });

      // totals recalculation when any cart product announces update
      thisCart.dom.productList.addEventListener('updated', () => {
        thisCart.update();
      });

      // remove a cart product
      thisCart.dom.productList.addEventListener('remove', (event) => {
        thisCart.remove(event.detail.cartProduct);
      });

      // submit order (no backend yet — logs payload)
      thisCart.dom.form.addEventListener('submit', (e) => {
        e.preventDefault();
        thisCart.sendOrder();
      });
    }

    add(menuProduct) {
      const thisCart = this;

      // render new line using template
      const generatedHTML = templates.cartProduct(menuProduct);
      const generatedDOM = utils.createDOMFromHTML(generatedHTML);
      thisCart.dom.productList.appendChild(generatedDOM);

      // create CartProduct instance
      const cartProduct = new CartProduct(menuProduct, generatedDOM);

      // keep reference for totals
      thisCart.products.push(cartProduct);

      // recalc totals
      thisCart.update();
    }

    update() {
      const thisCart = this;

      let totalNumber = 0;
      let subtotalPrice = 0;

      for (const product of thisCart.products) {
        totalNumber += product.amount;
        subtotalPrice += product.price;
      }

      const deliveryFee =
        totalNumber > 0 ? settings.cart.defaultDeliveryFee : 0;
      const totalPrice = subtotalPrice + deliveryFee;

      // update DOM fields
      thisCart.dom.totalNumber.innerHTML = totalNumber;
      if (thisCart.dom.subtotalPrice) {
        thisCart.dom.subtotalPrice.innerHTML = '$' + subtotalPrice;
      }
      if (thisCart.dom.deliveryFee) {
        thisCart.dom.deliveryFee.innerHTML = '$' + deliveryFee;
      }
      thisCart.dom.totalPrice.forEach((node) => {
        node.innerHTML = totalPrice;
      });

      // remember last computed numbers for sendOrder
      thisCart.subtotalPrice = subtotalPrice;
      thisCart.totalNumber = totalNumber;
      thisCart.totalPrice = totalPrice;
      thisCart.deliveryFee = deliveryFee;
    }

    remove(cartProduct) {
      const thisCart = this;

      // remove from array
      const index = thisCart.products.indexOf(cartProduct);
      if (index !== -1) {
        thisCart.products.splice(index, 1);
      }

      // remove DOM
      cartProduct.dom.wrapper.remove();

      // recalc totals
      thisCart.update();
    }

    sendOrder() {
      const thisCart = this;

      // simple front-end validation
      const errors = [];
      if (!thisCart.totalNumber) errors.push('Cart is empty');
      if (!thisCart.dom.phone.value) errors.push('Phone is required');
      if (!thisCart.dom.address.value) errors.push('Address is required');

      if (errors.length) {
        alert('Please fix:\n- ' + errors.join('\n- '));
        return;
      }

      // build payload (ready for sending via fetch later)
      const payload = {
        address: thisCart.dom.address.value,
        phone: thisCart.dom.phone.value,
        totalNumber: thisCart.totalNumber,
        subtotalPrice: thisCart.subtotalPrice,
        deliveryFee: thisCart.deliveryFee,
        totalPrice: thisCart.totalPrice,
        products: thisCart.products.map((p) => p.getData()),
      };

      // For now: just log the order (you can replace with fetch to your API)
      console.log('ORDER PAYLOAD:', payload);

      // Optional UX: simple reset after "submit"
      // thisCart.dom.form.reset();
      // thisCart.products.slice().forEach((p) => thisCart.remove(p));
    }
  }

  /* =========================
     App
  ========================== */
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

      // listen for "add-to-cart" from any product
      const productList = document.querySelector(select.containerOf.menu);
      productList.addEventListener('add-to-cart', function (event) {
        thisApp.cart.add(event.detail.product);
      });
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
}







































