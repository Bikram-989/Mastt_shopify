var MeetAjaxForProduct = function ajaxConstructor(settings) {
  var default_Data = {
    container: "#infinteLoop",
    method: "scroll",
    callback: null,
    loadingText: "Loading Now....",
    pagination: "#infinitePagination",
    offset: 0,
  };

  var data = settings || {};
  this.data = Object.assign(default_Data, data);

  this.meetProductClick = this.meetProductClick.bind(this);
  this.meetProductScroll = this.meetProductScroll.bind(this);
  this.meetProductDestroy = this.meetProductDestroy.bind(this);
  this.meetStopProductMultipleClicks = this.meetStopProductMultipleClicks.bind(this);
  this.meetProductPaginationlnView = this.meetProductPaginationlnView.bind(this);

  this.meetProductpagination = document.querySelector(this.data.pagination);
  this.meetProductcontainer = document.querySelector(this.data.container);

  this.meetProductInitialize();
};

MeetAjaxForProduct.prototype.meetProductInitialize = function basedProductsInitializeTheCorrectFunctionsMethod() {
  if (this.meetProductcontainer) {
    var initialidata = {
      click: this.meetProductClick,
      scroll: this.meetProductScroll,
    };
    if (initialidata[this.data.method]) {
      initialidata[this.data.method]();
    }
  }
};

MeetAjaxForProduct.prototype.meetProductScroll = function productsPageScrolling() {
  if (this.meetProductpagination) {
    document.addEventListener("scroll", this.meetProductPaginationlnView);
    window.addEventListener("resize", this.meetProductPaginationlnView);
    window.addEventListener("orientationchange", this.meetProductPaginationlnView);
  }
};

MeetAjaxForProduct.prototype.meetProductClick = function productsPageClicking() {
  if (this.meetProductpagination) {
    this.nextPageLinkElement = this.meetProductpagination.querySelector("a");
    this.clickActive = true;
    if (this.nextPageLinkElement) {
      this.nextPageLinkElement.addEventListener("click", this.meetStopProductMultipleClicks);
    }
  }
};

MeetAjaxForProduct.prototype.meetStopProductMultipleClicks = function prouctPageHandleClickEvent(event) {
  event.preventDefault();
  if (this.clickActive) {
    this.nextPageLinkElement.innerHTML = this.data.loadingText;
    this.nextPageUrl = this.nextPageLinkElement.href;
    this.clickActive = false;
    this.loadMore();
  }
};

MeetAjaxForProduct.prototype.meetProductPaginationlnView = function prouctPageHandleScrollEvent() {
  var top = this.meetProductpagination.getBoundingClientRect().top - this.data.offset;
  var bottom = this.meetProductpagination.getBoundingClientRect().bottom + this.data.offset;

  if (top <= window.innerHeight && bottom >= 0) {
    this.nextPageLinkElement = this.meetProductpagination.querySelector("a");
    this.removeScrollListener();

    if (this.nextPageLinkElement) {
      this.nextPageLinkElement.innerHTML = this.data.loadingText;
      this.nextPageUrl = this.nextPageLinkElement.href;
      this.loadMore();
    }
  }
};

MeetAjaxForProduct.prototype.loadMore = function nextPageRequest() {
  var loaderElement = document.getElementById("loader");
  if (loaderElement) loaderElement.style.display = "block";

  setTimeout(() => {
    this.request = new XMLHttpRequest();
    this.request.onreadystatechange = function success() {
      if (this.request.readyState === 4 && this.request.status === 200) {
        var cratedPagination = this.request.responseXML.querySelector(this.data.pagination);
        var cratedContaner = this.request.responseXML.querySelector(this.data.container);

        if (cratedPagination) {
          this.meetProductpagination.innerHTML = cratedPagination.innerHTML;
        } else {
          this.meetProductpagination.innerHTML = ""; // Remove pagination if none left
        }

        if (cratedContaner) {
          this.meetProductcontainer.insertAdjacentHTML("beforeend", cratedContaner.innerHTML);
        }

        if (this.data.callback && typeof this.data.callback === "function") {
          this.data.callback(this.request.responseXML);
        }

        if (!this.request.responseXML.querySelector(`${this.data.pagination} a`)) {
          console.log("No more products to load.");
          this.removeScrollListener();
          if (loaderElement) loaderElement.style.display = "none";
        } else {
          this.meetProductInitialize();
        }
      }
    }.bind(this);

    this.request.open("GET", this.nextPageUrl);
    this.request.responseType = "document";
    this.request.send();
  }, 2000);
};

MeetAjaxForProduct.prototype.removeScrollListener = function removeProductScroll() {
  document.removeEventListener("scroll", this.meetProductPaginationlnView);
  window.removeEventListener("resize", this.meetProductPaginationlnView);
  window.removeEventListener("orientationchange", this.meetProductPaginationlnView);
};

MeetAjaxForProduct.prototype.meetProductDestroy = function removeProductReturnData() {
  var yereData = {
    click: this.removeClickListener,
    scroll: this.removeScrollListener,
  };
  if (yereData[this.data.method]) {
    yereData[this.data.method]();
  }
  return this;
};

MeetAjaxForProduct.prototype.removeClickListener = function removeProductClick() {
  if (this.nextPageLinkElement) {
    this.nextPageLinkElement.removeEventListener("click", this.meetStopProductMultipleClicks);
  }
};