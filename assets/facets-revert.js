class FacetFiltersForm extends HTMLElement {
  constructor() {
    super();
    this.onActiveFilterClick = this.onActiveFilterClick.bind(this);

    this.debouncedOnSubmit = debounce((event) => {
      this.onSubmitHandler(event);
    }, 800);

    const facetForm = this.querySelector('form');
    facetForm.addEventListener('input', this.debouncedOnSubmit.bind(this));

    const facetWrapper = this.querySelector('#FacetsWrapperDesktop');
    if (facetWrapper) facetWrapper.addEventListener('keyup', onKeyUpEscape);
  }

  static setListeners() {
    const onHistoryChange = (event) => {
      const searchParams = event.state
        ? event.state.searchParams
        : FacetFiltersForm.searchParamsInitial;
      if (searchParams === FacetFiltersForm.searchParamsPrev) return;
      FacetFiltersForm.renderPage(searchParams, null, false);
    };
    window.addEventListener('popstate', onHistoryChange);
  }

  static toggleActiveFacets(disable = true) {
    document
      .querySelectorAll('.js-facet-remove')
      .forEach((element) => {
        element.classList.toggle('disabled', disable);
      });
  }

  static renderPage(searchParams, event, updateURLHash = true) {
    FacetFiltersForm.searchParamsPrev = searchParams;
    const sections = FacetFiltersForm.getSections();
    const countContainer = document.getElementById('ProductCount');
    const countContainerDesktop = document.getElementById('ProductCountDesktop');
    const loadingSpinners = document.querySelectorAll(
      '.facets-container .loading__spinner, facet-filters-form .loading__spinner'
    );
    loadingSpinners.forEach((spinner) => spinner.classList.remove('hidden'));
    document
      .getElementById('ProductGridContainer')
      .querySelector('.collection')
      .classList.add('loading');
    if (countContainer) countContainer.classList.add('loading');
    if (countContainerDesktop) countContainerDesktop.classList.add('loading');

    sections.forEach((section) => {
      const url = `${window.location.pathname}?section_id=${section.section}&${searchParams}`;
      const filterDataUrl = (element) => element.url === url;

      if (FacetFiltersForm.filterData.some(filterDataUrl)) {
        FacetFiltersForm.renderSectionFromCache(filterDataUrl, event);
      } else {
        FacetFiltersForm.renderSectionFromFetch(url, event);
      }
    });

    if (updateURLHash) FacetFiltersForm.updateURLHash(searchParams);

    // update the banner/title after the grid has been refreshed
    FacetFiltersForm.updateFacetBanner();

    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  static renderSectionFromFetch(url, event) {
    fetch(url)
      .then((response) => response.text())
      .then((responseText) => {
        const html = responseText;
        FacetFiltersForm.filterData = [
          ...FacetFiltersForm.filterData,
          { html, url },
        ];
        FacetFiltersForm.renderFilters(html, event);
        FacetFiltersForm.renderProductGridContainer(html);
        FacetFiltersForm.renderProductCount(html);
        if (typeof initializeScrollAnimationTrigger === 'function')
          initializeScrollAnimationTrigger(html.innerHTML);
      });
  }

  static renderSectionFromCache(filterDataUrl, event) {
    const html = FacetFiltersForm.filterData.find(filterDataUrl).html;
    FacetFiltersForm.renderFilters(html, event);
    FacetFiltersForm.renderProductGridContainer(html);
    FacetFiltersForm.renderProductCount(html);
    if (typeof initializeScrollAnimationTrigger === 'function')
      initializeScrollAnimationTrigger(html.innerHTML);
  }

  static renderProductGridContainer(html) {
    document.getElementById('ProductGridContainer').innerHTML = new DOMParser()
      .parseFromString(html, 'text/html')
      .getElementById('ProductGridContainer').innerHTML;

    document
      .getElementById('ProductGridContainer')
      .querySelectorAll('.scroll-trigger')
      .forEach((element) => {
        element.classList.add('scroll-trigger--cancel');
      });
  }

  static renderProductCount(html) {
    const count = new DOMParser()
      .parseFromString(html, 'text/html')
      .getElementById('ProductCount').innerHTML;
    const container = document.getElementById('ProductCount');
    const containerDesktop = document.getElementById('ProductCountDesktop');
    container.innerHTML = count;
    container.classList.remove('loading');
    if (containerDesktop) {
      containerDesktop.innerHTML = count;
      containerDesktop.classList.remove('loading');
    }
    const loadingSpinners = document.querySelectorAll(
      '.facets-container .loading__spinner, facet-filters-form .loading__spinner'
    );
    loadingSpinners.forEach((spinner) => spinner.classList.add('hidden'));
  }

  static renderFilters(html, event) {
    const parsedHTML = new DOMParser().parseFromString(html, 'text/html');
    const fetched = parsedHTML.querySelectorAll(
      '#FacetFiltersForm .js-filter, #FacetFiltersFormMobile .js-filter, #FacetFiltersPillsForm .js-filter'
    );
    const current = document.querySelectorAll(
      '#FacetFiltersForm .js-filter, #FacetFiltersFormMobile .js-filter, #FacetFiltersPillsForm .js-filter'
    );

    Array.from(current).forEach((el) => {
      if (!Array.from(fetched).some((f) => f.id === el.id)) el.remove();
    });

    const matchesId = (el) => {
      const jsFilter = event ? event.target.closest('.js-filter') : undefined;
      return jsFilter ? el.id === jsFilter.id : false;
    };

    const toRender = Array.from(fetched).filter((el) => !matchesId(el));
    const countsToRender = Array.from(fetched).find(matchesId);

    toRender.forEach((el, idx) => {
      const existing = document.getElementById(el.id);
      if (existing) {
        existing.innerHTML = el.innerHTML;
      } else {
        if (idx > 0 && el.className === toRender[idx - 1].className) {
          document.getElementById(toRender[idx - 1].id).after(el);
          return;
        }
        if (el.parentElement) {
          document
            .querySelector(`#${el.parentElement.id} .js-filter`)
            .before(el);
        }
      }
    });

    FacetFiltersForm.renderActiveFacets(parsedHTML);
    FacetFiltersForm.renderAdditionalElements(parsedHTML);

    if (countsToRender) {
      const closestID = event.target.closest('.js-filter').id;
      FacetFiltersForm.renderCounts(countsToRender, event.target.closest('.js-filter'));
      FacetFiltersForm.renderMobileCounts(
        countsToRender,
        document.getElementById(closestID)
      );

      const newEl = document.getElementById(closestID);
      const selector = newEl.classList.contains('mobile-facets__details')
        ? `.mobile-facets__close-button`
        : `.facets__summary`;
      const toFocus = newEl.querySelector(selector);
      const isText = event.target.getAttribute('type') === 'text';

      if (toFocus && !isText) toFocus.focus();
    }
  }

  static renderActiveFacets(html) {
    ['.active-facets-mobile', '.active-facets-desktop'].forEach((sel) => {
      const fetched = html.querySelector(sel);
      if (!fetched) return;
      document.querySelector(sel).innerHTML = fetched.innerHTML;
    });
    FacetFiltersForm.toggleActiveFacets(false);
  }

  static renderAdditionalElements(html) {
    ['.mobile-facets__open', '.mobile-facets__count', '.sorting'].forEach((sel) => {
      const fetched = html.querySelector(sel);
      if (!fetched) return;
      document.querySelector(sel).innerHTML = fetched.innerHTML;
    });
    document
      .getElementById('FacetFiltersFormMobile')
      .closest('menu-drawer')
      .bindEvents();
  }

  static renderCounts(source, target) {
    const tgtSummary = target.querySelector('.facets__summary');
    const srcSummary = source.querySelector('.facets__summary');
    if (srcSummary && tgtSummary) tgtSummary.outerHTML = srcSummary.outerHTML;

    const tgtHeader = target.querySelector('.facets__header');
    const srcHeader = source.querySelector('.facets__header');
    if (srcHeader && tgtHeader) tgtHeader.outerHTML = srcHeader.outerHTML;

    const tgtWrap = target.querySelector('.facets-wrap');
    const srcWrap = source.querySelector('.facets-wrap');
    if (srcWrap && tgtWrap) {
      const isShowingMore = Boolean(
        target.querySelector('show-more-button .label-show-more.hidden')
      );
      if (isShowingMore) {
        srcWrap
          .querySelectorAll('.facets__item.hidden')
          .forEach((hi) => hi.classList.replace('hidden', 'show-more-item'));
      }
      tgtWrap.outerHTML = srcWrap.outerHTML;
    }
  }

  static renderMobileCounts(source, target) {
    const tgtList = target.querySelector('.mobile-facets__list');
    const srcList = source.querySelector('.mobile-facets__list');
    if (srcList && tgtList) tgtList.outerHTML = srcList.outerHTML;
  }

  static updateURLHash(searchParams) {
    history.pushState(
      { searchParams },
      '',
      `${window.location.pathname}${searchParams ? '?'.concat(searchParams) : ''}`
    );
  }

  static getSections() {
    // Only reload the product grid—do not touch the banner section
    return [{ section: document.getElementById('product-grid').dataset.id }];
  }

  static getSelectedCategoryLabels() {
    return Array.from(
      document.querySelectorAll('input[name="filter.p.t.category"]:checked')
    ).map((input) =>
      input
        .closest('label')
        .querySelector('.facet-checkbox__text-label')
        .textContent.trim()
    );
  }

  static getSelectedMaterialLabels() {
    return Array.from(
      document.querySelectorAll(
        'input[name="filter.p.m.custom.jewellery_material"]:checked'
      )
    ).map((input) =>
      input
        .closest('label')
        .querySelector('.facet-checkbox__text-label')
        .textContent.trim()
    );
  }

static updateFacetBanner() {
  const sectionEl = document.getElementById('FacetDrivenBanner');
  if (!sectionEl) return;

  const titleEl = document.getElementById('FacetBannerTitle');
  const container = document.getElementById('FacetBannerContainer');

  // Defaults
  const defaultTitle   = sectionEl.dataset.defaultTitle   || titleEl.textContent;
  const defaultDesktop = sectionEl.dataset.defaultDesktop;
  const defaultMobile  = sectionEl.dataset.defaultMobile;

  // Parse the JSON arrays
  let categoryEntries, materialEntries;
  try {
    categoryEntries = JSON.parse(sectionEl.dataset.categoryEntries  || '[]');
    materialEntries = JSON.parse(sectionEl.dataset.materialEntries  || '[]');
  } catch (e) {
    console.error('Failed to parse facet-driven banner JSON', e);
    categoryEntries = [];
    materialEntries = [];
  }

  // Turn arrays into lookup maps
  const catMap = {};
  categoryEntries.forEach((e) => {
    catMap[e.name] = { desktop: e.desktop, mobile: e.mobile };
  });
  const matMap = {};
  materialEntries.forEach((e) => {
    matMap[e.name] = { desktop: e.desktop, mobile: e.mobile };
  });

  // Read exactly-one selected label from each filter
  const cats = Array.from(
    document.querySelectorAll('input[name="filter.p.t.category"]:checked')
  ).map((i) => i.closest('label').querySelector('.facet-checkbox__text-label').textContent.trim());

  const mats = Array.from(
    document.querySelectorAll('input[name="filter.p.m.custom.jewellery_material"]:checked')
  ).map((i) => i.closest('label').querySelector('.facet-checkbox__text-label').textContent.trim());

  const singleCat = cats.length === 1 ? cats[0] : null;
  const singleMat = mats.length === 1 ? mats[0] : null;
  const isMobile  = window.matchMedia('(max-width: 749px)').matches;

  // Priority: Material > Category > Default
  let text, imageUrl;
  if (singleMat && matMap[singleMat]) {
    text     = singleMat;
    imageUrl = isMobile ? matMap[singleMat].mobile : matMap[singleMat].desktop;
  } else if (singleCat && catMap[singleCat]) {
    text     = singleCat;
    imageUrl = isMobile ? catMap[singleCat].mobile : catMap[singleCat].desktop;
  } else {
    text     = defaultTitle;
    imageUrl = isMobile ? defaultMobile : defaultDesktop;
  }

  titleEl.textContent             = text;
  container.style.backgroundImage = `url('${imageUrl}')`;
}



  createSearchParams(form) {
    const formData = new FormData(form);
    return new URLSearchParams(formData).toString();
  }

  onSubmitForm(searchParams, event) {
    FacetFiltersForm.renderPage(searchParams, event);
  }

  onSubmitHandler(event) {
    event.preventDefault();
    const sortFilterForms = document.querySelectorAll('facet-filters-form form');
    if (event.srcElement.className == 'mobile-facets__checkbox') {
      const searchParams = this.createSearchParams(event.target.closest('form'));
      this.onSubmitForm(searchParams, event);
    } else {
      const forms = [];
      const isMobile = event.target.closest('form').id === 'FacetFiltersFormMobile';

      sortFilterForms.forEach((form) => {
        if (!isMobile) {
          if (
            form.id === 'FacetSortForm' ||
            form.id === 'FacetFiltersForm' ||
            form.id === 'FacetSortDrawerForm'
          ) {
            forms.push(this.createSearchParams(form));
          }
        } else if (form.id === 'FacetFiltersFormMobile') {
          forms.push(this.createSearchParams(form));
        }
      });
      this.onSubmitForm(forms.join('&'), event);
    }
  }

  onActiveFilterClick(event) {
    event.preventDefault();
    FacetFiltersForm.toggleActiveFacets();
    const url =
      event.currentTarget.href.indexOf('?') === -1
        ? ''
        : event.currentTarget.href.slice(
            event.currentTarget.href.indexOf('?') + 1
          );
    FacetFiltersForm.renderPage(url);
  }
}

// Run on initial load
document.addEventListener('DOMContentLoaded', () => {
  FacetFiltersForm.updateFacetBanner();

  // Also re-run whenever any relevant checkbox toggles:
  document
    .querySelectorAll(
      'input[name="filter.p.t.category"], input[name="filter.p.m.custom.jewellery_material"]'
    )
    .forEach((chk) => chk.addEventListener('change', FacetFiltersForm.updateFacetBanner));

  // And if you’re using the “remove” pills:
  document
    .querySelectorAll('.facet-remove a')
    .forEach((btn) => btn.addEventListener('click', FacetFiltersForm.updateFacetBanner));
});




FacetFiltersForm.filterData = [];
FacetFiltersForm.searchParamsInitial = window.location.search.slice(1);
FacetFiltersForm.searchParamsPrev = window.location.search.slice(1);
customElements.define('facet-filters-form', FacetFiltersForm);
FacetFiltersForm.setListeners();


class PriceRange extends HTMLElement {
  constructor() {
    super();
    this.querySelectorAll('input').forEach((element) => {
      element.addEventListener('change', this.onRangeChange.bind(this));
      element.addEventListener('keydown', this.onKeyDown.bind(this));
    });
    this.setMinAndMaxValues();
  }
  onRangeChange(event) {
    this.adjustToValidValues(event.currentTarget);
    this.setMinAndMaxValues();
  }
  onKeyDown(event) {
    if (event.metaKey) return;
    const pattern = /[0-9]|\.|,|'| |Tab|Backspace|Enter|ArrowUp|ArrowDown|ArrowLeft|ArrowRight|Delete|Escape/;
    if (!event.key.match(pattern)) event.preventDefault();
  }
  setMinAndMaxValues() {
    const inputs = this.querySelectorAll('input');
    const minInput = inputs[0];
    const maxInput = inputs[1];
    if (maxInput.value) minInput.setAttribute('data-max', maxInput.value);
    if (minInput.value) maxInput.setAttribute('data-min', minInput.value);
    if (minInput.value === '') maxInput.setAttribute('data-min', 0);
    if (maxInput.value === '') minInput.setAttribute('data-max', maxInput.getAttribute('data-max'));
  }
  adjustToValidValues(input) {
    const value = Number(input.value);
    const min = Number(input.getAttribute('data-min'));
    const max = Number(input.getAttribute('data-max'));
    if (value < min) input.value = min;
    if (value > max) input.value = max;
  }
}
customElements.define('price-range', PriceRange);


class FacetRemove extends HTMLElement {
  constructor() {
    super();
    const facetLink = this.querySelector('a');
    facetLink.setAttribute('role', 'button');
    facetLink.addEventListener('click', this.closeFilter.bind(this));
    facetLink.addEventListener('keyup', (event) => {
      if (event.code === 'Space') this.closeFilter(event);
    });
  }
  closeFilter(event) {
    event.preventDefault();
    const form = this.closest('facet-filters-form') || document.querySelector('facet-filters-form');
    form.onActiveFilterClick(event);
  }
}
customElements.define('facet-remove', FacetRemove);
