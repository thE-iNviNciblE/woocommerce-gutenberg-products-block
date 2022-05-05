import {
	canvas,
	createNewPost,
	deleteAllTemplates,
	insertBlock,
	switchUserToAdmin,
	publishPost,
} from '@wordpress/e2e-test-utils';
import { Frame } from 'puppeteer';
import {
	BASE_URL,
	goToTemplateEditor,
	openBlockEditorSettings,
	saveTemplate,
	useTheme,
} from '../../utils';

const block = {
	name: 'Filter Products by Attribute',
	slug: 'woocommerce/attribute-filter',
	class: '.wc-block-attribute-filter',
	selectors: {
		editor: {
			firstAttributeInTheList:
				'.woocommerce-search-list__list > li > label > input.woocommerce-search-list__item-input',
			filterButtonToggle: "//label[text()='Filter button']",
			doneButton: '.wc-block-attribute-filter__selection > button',
		},
		frontend: {
			firstAttributeInTheList:
				'.wc-block-attribute-filter-list > li:not([class^="is-loading"])',
			productsList: '.wc-block-grid__products > li',
			classicProductsList: '.products.columns-3 > li',
			filter: "input[id='128gb']",
			submitButton: '.wc-block-components-filter-submit-button',
		},
	},
	urlSearchParamWhenFilterIsApplied:
		'?filter_capacity=128gb&query_type_capacity=or',
};

const waitForAllProductsBlockLoaded = () =>
	page.waitForSelector( selectors.frontend.productsList + '.is-loading', {
		hidden: true,
	} );

const goToShopPage = () =>
	page.goto( BASE_URL + '/shop', {
		waitUntil: 'networkidle0',
	} );

const { selectors } = block;

describe( `${ block.name } Block`, () => {
	describe( 'with All Product Block', () => {
		let link = '';
		beforeAll( async () => {
			await switchUserToAdmin();
			await createNewPost( {
				postType: 'post',
				title: block.name,
			} );

			await insertBlock( block.name );
			await page.click( selectors.editor.firstAttributeInTheList );
			await page.click( selectors.editor.doneButton );
			await insertBlock( 'All Products' );
			await publishPost();

			link = await page.evaluate( () =>
				wp.data.select( 'core/editor' ).getPermalink()
			);
		} );

		it( 'should render', async () => {
			await page.goto( link );
			await waitForAllProductsBlockLoaded();
			const products = await page.$$( selectors.frontend.productsList );

			expect( products ).toHaveLength( 5 );
		} );

		it( 'should show only products that match the filter', async () => {
			const isRefreshed = jest.fn( () => void 0 );
			page.on( 'load', isRefreshed );
			await page.click( selectors.frontend.filter );
			await waitForAllProductsBlockLoaded();
			const products = await page.$$( selectors.frontend.productsList );

			expect( isRefreshed ).not.toBeCalled();
			expect( products ).toHaveLength( 1 );
		} );
	} );

	describe( 'with PHP classic template ', () => {
		const productCatalogTemplateId =
			'woocommerce/woocommerce//archive-product';

		useTheme( 'emptytheme' );
		beforeAll( async () => {
			await goToTemplateEditor( {
				postId: productCatalogTemplateId,
			} );
			await insertBlock( block.name );
			const canvasEl: Frame = canvas();

			// It seems that .click doesn't work well with radio input element.
			await canvasEl.$eval(
				block.selectors.editor.firstAttributeInTheList,
				( el ) => ( el as HTMLInputElement ).click()
			);
			await canvasEl.click( selectors.editor.doneButton );
			await saveTemplate();
		} );

		it( 'should render', async () => {
			await goToShopPage();
			const products = await page.$$(
				selectors.frontend.classicProductsList
			);

			expect( products ).toHaveLength( 5 );
		} );

		it( 'should show only products that match the filter', async () => {
			const isRefreshed = jest.fn( () => void 0 );
			page.on( 'load', isRefreshed );

			await page.waitForSelector( block.class + '.is-loading', {
				hidden: true,
			} );

			await Promise.all( [
				page.waitForNavigation( {
					waitUntil: 'networkidle0',
				} ),
				page.click( selectors.frontend.filter ),
			] );

			const products = await page.$$(
				selectors.frontend.classicProductsList
			);

			const pageURL = page.url();
			const parsedUrl = new URL( pageURL );

			expect( isRefreshed ).toBeCalledTimes( 1 );
			expect( products ).toHaveLength( 1 );
			expect( parsedUrl.search ).toEqual(
				block.urlSearchParamWhenFilterIsApplied
			);
		} );

		it( 'should refresh the page only if the user click on button', async () => {
			await goToTemplateEditor( {
				postId: productCatalogTemplateId,
			} );

			const canvasEl: Frame = canvas();
			await canvasEl.click( block.class );
			await openBlockEditorSettings();
			const [ filterButtonToggle ] = await page.$x(
				block.selectors.editor.filterButtonToggle
			);
			await filterButtonToggle.click();
			await saveTemplate();
			await goToShopPage();

			const isRefreshed = jest.fn( () => void 0 );
			page.on( 'load', isRefreshed );
			await page.waitForSelector( block.class + '.is-loading', {
				hidden: true,
			} );
			await page.waitForSelector( selectors.frontend.filter );
			await page.click( selectors.frontend.filter ),
				await Promise.all( [
					page.waitForNavigation( {
						waitUntil: 'networkidle0',
					} ),
					page.click( selectors.frontend.submitButton ),
				] );

			const products = await page.$$(
				selectors.frontend.classicProductsList
			);
			const pageURL = page.url();
			const parsedUrl = new URL( pageURL );

			expect( isRefreshed ).toBeCalledTimes( 1 );
			expect( products ).toHaveLength( 1 );
			expect( parsedUrl.search ).toEqual(
				block.urlSearchParamWhenFilterIsApplied
			);
		} );
	} );

	afterAll( async () => {
		await deleteAllTemplates( 'wp_template' );
	} );
} );
