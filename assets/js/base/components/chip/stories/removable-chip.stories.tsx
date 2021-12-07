/**
 * External dependencies
 */
import { Story, Meta } from '@storybook/react';

/**
 * Internal dependencies
 */
import { RemovableChip, RemovableChipProps } from '../removable-chip';

export default {
	title: 'WooCommerce Blocks/@base-components/RemovableChip',
	component: RemovableChip,
} as Meta< RemovableChipProps >;

const Template: Story< RemovableChipProps > = ( args ) => (
	<RemovableChip { ...args } />
);

export const Default = Template.bind( {} );
Default.args = {
	text: 'Take me to the casino',
	screenReaderText: "I'm a removable chip, me",
	onRemove: () => {
		window.alert( 'Chip Removed!' ); //eslint-disable-line
	},
};
