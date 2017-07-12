'use strict';

(function() {
    Polymer({
        is: 'partners-list-view',

        behaviors: [
            etoolsAppConfig.globals,
            TPMBehaviors.PermissionController,
            TPMBehaviors.StaticDataController,
            TPMBehaviors.CommonMethodsBehavior,
        ],

        properties: {
            basePermissionPath: {
                type: String,
                observer: '_basePathChanged'
            },
            data: {
                type: Object,
                value: {},
            },
            originalData: {
                type: Object,
                value: {}
            },
            updateData: {
                type: Object,
            },
            errors: {
                type: Object,
                value: {}
            },
            newVendorOpened: {
                type: Boolean,
                value: false
            },
            queryParams: {
                type: Object,
                notify: true
            },
            listHeadings: {
                type: Array,
                value: [{
                    'size': 25,
                    'label': 'Vendor #',
                    'name': 'vendor_number',
                    'link': 'partners/*data_id*/details',
                    'ordered': false
                }, {
                    'size': 45,
                    'label': 'Vendor Name',
                    'name': 'name',
                    'ordered': false
                }, {
                    'size': 30,
                    'label': 'Country',
                    'name': 'country',
                    'ordered': false
                }]
            },
            listDetails: {
                type: Array,
                value: function() {
                    return [{
                        'size': 20,
                        'label': 'Email',
                        'name': 'email'
                    }, {
                        'size': 20,
                        'label': 'Phone #',
                        'name': 'phone_number'
                    }];
                }
            },
            partnersList: {
                type: Array,
                value: []
            },
        },

        listeners: {
            'add-new-tap': 'openNewVendorDialog',
            'vendor-loaded': '_vendorLoaded',
            'dialog-confirmed': 'updateVendor',
            'vendor-updated': 'vendorUpdated',
        },

        observers: [
            '_errorHandler(errorObject)',
            'updateStyles(vendorUpdating, requestInProcess, vendorRequestInProcess, vendorNumber)',
        ],

        ready: function() {
            this.$.vendorNumber.validate = this._validateVendorNumber.bind(this, this.$.vendorNumber);
            this.$.emailInput.validate = this._validateEmailAddress.bind(this, this.$.emailInput);
        },

        validate: function() {
            let vendorNumberValid = this.$.vendorNumber.validate();
            let phoneInputValid = this.$.phoneInput.validate();
            let emailInputValid = this.$.emailInput.validate();

            return vendorNumberValid && phoneInputValid && emailInputValid;
        },

        _requestVendor: function(event) {
            if (this.vendorRequestInProcess) { return false; }

            let value = event && event.target && event.target.value;

            if (+value && value === this.vendorNumber) { return false; }

            this.resetVendor();

            if (!value) {
                this.vendorNumber = null;
                return false;
            }

            this.vendorRequestInProcess = true;
            this.vendorNumber = value;
            return true;
        },

        _vendorLoaded: function() {
            this.$.vendorNumber.validate();
            this.vendorRequestInProcess = false;
        },

        resetVendor: function() {
            this.set('data', {vendor_number: this.data && this.data.vendor_number});
            this.set('vendorNumber', null);
        },

        _validateVendorNumber: function(vendorNumberInput) {
            if (this.requestInProcess) {
                this.set('errors.vendor_number', 'Please, wait until Vendor Number loaded');
                return false;
            }
            let value = vendorNumberInput && vendorNumberInput.value;
            if (!value && vendorNumberInput && vendorNumberInput.required) {
                this.set('errors.vendor_number', 'Vendor Number is required');
                return false;
            }
            if (!this.data || !this.data.id) {
                this.set('errors.vendor_number', 'Vendor Number not found');
                return false;
            }
            this.set('errors.vendor_number', false);
            return true;
        },

        _validateEmailAddress: function(emailInput) {
            let value = emailInput.value;
            let required = emailInput.required;
            let re = /^(([^<>()[\]\\.,;:\s@\"]+(\.[^<>()[\]\\.,;:\s@\"]+)*)|(\".+\"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;

            if (required && !value) {
                this.set('errors.email', 'Email is required');
                return false;
            }

            if (value && !re.test(value)) {
                this.set('errors.email', 'Email is incorrect');
                return false;
            }

            return true;
        },

        updateVendor: function() {
            if (!this.validate()) { return false; }
            let updateData = {};

            if (this.originalData.phone_number !== this.data.phone_number) { updateData.phone_number = this.data.phone_number || null; }
            if (this.originalData.email !== this.data.email) { updateData.email = this.data.email || null; }
            if (this.originalData.hidden === true) { updateData.hidden = false; }

            if (_.isEqual(updateData, {})) {
                this.vendorUpdated();
            } else {
                this.requestInProcess = true;
                this.updateData = updateData;
            }
        },

        vendorUpdated: function(event, detail) {
            if (this.requestInProcess) { this.requestInProcess = false; }

            if (detail && !detail.success) { return false; }

            this.newVendorOpened = false;
            this.openVendorDetails();
        },

        openVendorDetails: function() {
            //redirect
            let partnerId = this.data && this.data.id;
            let path = `partners/${partnerId}/details`;
            this.set('path', this.getAbsolutePath(path));
        },

        openNewVendorDialog: function() {
            this.originalData = {};
            this.data = {};
            this.updateData = null;

            this.vendorNumber = null;
            this.requestInProcess = false;
            this.vendorRequestInProcess = false;
            this.newVendorOpened = true;

            this.set('errors', {});
        },

        _showAddButton: function() {
            return this.actionAllowed('new_partner', 'create');
        },

        _showPhoneAndEmail: function(vendorNumber, basePermissionPath, requestInProcess, vendorRequestInProcess) {
            let vendorNumberInvalid = !vendorNumber && this.errors.vendor_number;
            return this.isReadOnly('phone_number', basePermissionPath, requestInProcess) || vendorRequestInProcess || vendorNumberInvalid;
        },
    });
})();
