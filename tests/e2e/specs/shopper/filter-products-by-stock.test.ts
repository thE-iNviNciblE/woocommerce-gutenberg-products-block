import {
	canvas,
	createNewPost,
	deleteAllTemplates,
	insertBlock,
	switchUserToAdmin,
	publishPost,
} from '@wordpress/e2e-test-utils';
import {
	BASE_URL,
	goToTemplateEditor,
	saveTemplate,
	useTheme,
} from '../../utils';

const block = {
	name: 'Filter Products by Stock',
	slug: 'woocommerce/filter-products-by-stock',
	class: '.wc-block-attribute-filter',
	selectors: {
		editor: {
			doneButton: '.wc-block-attribute-filter__selection > button',
		},
		frontend: {
			productsList: '.wc-block-grid__products > li',
			classicProductsList: '.products.columns-3 > li',
			filter: "input[id='outofstock']",
		},
	},
};

const waitForAllProductsBlockLoaded = () =>
	page.waitForSelector( selectors.frontend.productsList + '.is-loading', {
		hidden: true,
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
		useTheme( 'emptytheme' );
		beforeAll( async () => {
			await goToTemplateEditor( {
				postId: `woocommerce/woocommerce//archive-product`,
			} );
			await insertBlock( block.name );
			await saveTemplate();
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
			await page.waitForSelector( selectors.frontend.filter );
			await Promise.all( [
				page.waitForNavigation( {
					waitUntil: 'networkidle0',
				} ),
				page.click( selectors.frontend.filter ),
			] );
			const products = await page.$$(
				selectors.frontend.classicProductsList
			);

			expect( isRefreshed ).toBeCalled();
			expect( products ).toHaveLength( 1 );
		} );
	} );

	afterAll( async () => {
		await deleteAllTemplates( 'wp_template' );
	} );
} );
