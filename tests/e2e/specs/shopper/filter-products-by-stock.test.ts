import {
	createNewPost,
	deleteAllTemplates,
	insertBlock,
	switchUserToAdmin,
	publishPost,
} from '@wordpress/e2e-test-utils';
import { selectBlockByName } from '@woocommerce/blocks-test-utils';
import {
	BASE_URL,
	goToTemplateEditor,
	openBlockEditorSettings,
	saveTemplate,
	useTheme,
	waitForCanvas,
} from '../../utils';

const block = {
	name: 'Filter Products by Stock',
	slug: 'woocommerce/stock-filter',
	class: '.wc-block-stock-filter',
	selectors: {
		editor: {
			filterButtonToggle: "//label[text()='Filter button']",
		},
		frontend: {
			productsList: '.wc-block-grid__products > li',
			classicProductsList: '.products.columns-3 > li',
			filter: "input[id='outofstock']",
			submitButton: '.wc-block-components-filter-submit-button',
		},
	},
	urlSearchParamWhenFilterIsApplied: '?filter_stock_status=outofstock',
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

fdescribe( `${ block.name } Block`, () => {
	describe( 'with All Product Block', () => {
		let link = '';
		beforeAll( async () => {
			await switchUserToAdmin();
			await createNewPost( {
				postType: 'post',
				title: block.name,
			} );

			await insertBlock( block.name );
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

	fdescribe( 'with PHP classic template ', () => {
		const productCatalogTemplateId =
			'woocommerce/woocommerce//archive-product';

		useTheme( 'emptytheme' );
		beforeAll( async () => {
			await deleteAllTemplates( 'wp_template' );
			await deleteAllTemplates( 'wp_template_part' );
			await goToTemplateEditor( {
				postId: productCatalogTemplateId,
			} );
			await insertBlock( block.name );
			await saveTemplate();
		} );

		afterAll( async () => {
			await deleteAllTemplates( 'wp_template' );
			await deleteAllTemplates( 'wp_template_part' );
		} );

		it( 'should render', async () => {
			await page.goto( BASE_URL + '/shop', {
				waitUntil: 'networkidle0',
			} );
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

			expect( isRefreshed ).toBeCalledTimes( 1 );
			expect( products ).toHaveLength( 1 );
		} );

		it( 'should refresh the page only if the user click on button', async () => {
			await goToTemplateEditor( {
				postId: productCatalogTemplateId,
			} );

			await waitForCanvas();
			await page.waitForTimeout( 5000 );
			await selectBlockByName( block.slug );
			await page.waitForTimeout( 5000 );

			await openBlockEditorSettings();

			const test = await page.$eval(
				'.edit-site-sidebar__panel-tab.is-active',
				( element ) => element.getAttribute( 'aria-label' )
			);

			console.log( test );

			await page.waitForTimeout( 5000 );

			await page.waitForXPath(
				block.selectors.editor.filterButtonToggle,
				{ timeout: 90000 }
			);
			const [ filterButtonToggle ] = await page.$x(
				selectors.editor.filterButtonToggle
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
} );
