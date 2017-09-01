'use strict';

Polymer({
    is: 'visit-activity-tab',

    behaviors: [
        TPMBehaviors.DateBehavior,
        TPMBehaviors.StaticDataController,
        TPMBehaviors.TableElementsBehavior,
        TPMBehaviors.CommonMethodsBehavior,
        TPMBehaviors.TextareaMaxRowsBehavior,
    ],

    properties: {
        mainProperty: {
            type: String,
            value: 'tpm_activities'
        },
        partner: {
            type: Object,
            value: function() {
                return {};
            }
        },
        partnership: {
            type: Object,
            value: function() {
                return {};
            }
        },
        cpOutputs: {
            type: Array,
            value: function() {
                return [];
            }
        },
        itemModel: {
            type: Object,
            value: function() {
                return {
                    implementing_partner: {
                        id: null,
                        name: '',
                    },
                    partnership: {
                        id: null,
                        title: '',
                    },
                    cp_output: {
                        id: null,
                        result_name: '',
                    },
                    date: '',
                    locations: [],
                    section: null,
                    additional_information: '',
                };
            }
        },
        optionsModel: {
            type: Object,
            value: function() {
                return {
                    partnership: null,
                    cp_output: null,
                    locations: null,
                };
            },
        },
        partnerRequestInProcess: {
            type: Boolean,
            value: false,
        },
        partnershipRequestInProcess: {
            type: Boolean,
            value: false,
        },
        cpRequestInProcess: {
            type: Boolean,
            value: false,
        },
        someRequestInProcess: {
            type: Boolean,
            value: false,
        },
        columns: {
            type: Array,
            value: [{
                'size': 25,
                'label': 'Implementing Partner',
                'path': 'implementing_partner.name'
            }, {
                'size': 30,
                'label': 'Partnership',
                'path': 'partnership.title'
            }, {
                'size': 30,
                'label': 'CP Output',
                'path': 'cp_output.name'
            }, {
                'size': 15,
                'name': 'date',
                'label': 'Date',
                'path': 'date'
            }]
        },
        details: {
            type: Array,
            value: function() {
                return [{
                    'size': 100,
                    'label': 'Section',
                    'path': 'section.name',
                }, {
                    'size': 100,
                    'name': 'array',
                    'property': 'name',
                    'label': 'Locations',
                    'path': 'locations',
                }, {
                    'size': 100,
                    'label': 'Additional information',
                    'path': 'additional_information',
                }];
            }
        },
        addDialogTexts: {
            type: Object,
            value: function() {
                return {
                    title: 'Add Visit Activity'
                };
            }
        },
        editDialogTexts: {
            type: Object,
            value: function() {
                return {
                    title: 'Edit Visit Activity'
                };
            }
        },
        deleteTitle: {
            type: String,
            value: 'Are you sure that you want to delete this visit activity?'
        },
    },

    listeners: {
        'dialog-confirmed': '_addItemFromDialog',
        'delete-confirmed': 'removeItem',
        'partner-loaded': '_partnerLoaded',
        'partnership-loaded': '_partnershipLoaded',
        'cp-outputs-loaded': '_cpOutputsLoaded',
    },

    observers: [
        '_setSomeRequestInProcess(requestInProcess, partnerRequestInProcess, partnershipRequestInProcess, cpRequestInProcess)',
        '_requestPartner(editedItem.implementing_partner.id)',
        '_requestPartnership(optionsModel.partnership.id)',
        'resetDialog(dialogOpened)',
        '_errorHandler(errorObject.tpm_activities)',
        'updateStyles(basePermissionPath, someRequestInProcess, editedItem.*, optionsModel.*)',
        '_setPartnershipValue(partner.interventions, editedItem.partnership)',
        '_setCpValue(cpOutputs, editedItem.cp_output)',
        '_setLocationsValue(locations, editedItem.locations)',
    ],

    ready: function() {
        this.partners = this.getData('partnerOrganisations') || [];
        this.sections = this.getData('sections') || [];
    },

    _setSomeRequestInProcess: function(requestInProcess, partnerRequestInProcess, partnershipRequestInProcess, cpRequestInProcess) {
        this.someRequestInProcess = requestInProcess || partnerRequestInProcess || partnershipRequestInProcess || cpRequestInProcess;
    },

    _getActivitiesLength: function(dataItemsLength) {
        return dataItemsLength || 0;
    },

    _isReadOnly: function(partner, partnership, someRequestInProcess) {
        let partnerDefined = partner && (partner.id || partner.id === 0) || partner === 'true';
        let partnershipDefined = partnership && (partnership.id || partnership.id === 0) || partnership === 'true';
        return !partnerDefined || !partnershipDefined || someRequestInProcess;
    },

    _setPartnershipValue: function(options, value) {
        if (value && value.id && options && options.length) {
            let optionsContainsPartnership = options.find((option) => {
                return option.id === value.id;
            });
            if (optionsContainsPartnership) {
                this.async(() => {
                    this.set('optionsModel.partnership', value);
                }, 200);
            }
        }
    },

    _setCpValue: function(options, value) {
        if (value && value.id && options && options.length) {
            let optionsContainsCp = options.find((option) => {
                return option.id === +value.id;
            });
            if (optionsContainsCp) {
                this.async(() => {
                    this.set('optionsModel.cp_output', value);
                }, 200);
            }
        }
    },

    _setLocationsValue: function(options, values) {
        if (values && values.length && options && options.length) {
            let filteredLocations = _.filter(values, (location) => {
                return !!options.find((option) => {
                    return option.id === location.id;
                });
            });
            if (filteredLocations.length === values.length && filteredLocations.length !== 0) {
                this.async(() => {
                    this.set('optionsModel.locations', values);
                }, 200);
            }
        }
    },

    _requestPartner: function(partnerId) {
        if (this.partnerRequestInProcess || this.lastPartnerId === partnerId) { return; }
        this.lastPartnerId = partnerId;

        if (!this.editDialogOpened) {
            this.set('partnership', null);
            this.set('optionsModel.partnership', null);
            this.set('partner.interventions', []);

            this.set('optionsModel.locations', []);
            this.set('locations', []);

            this.set('optionsModel.cp_output', null);
            this.set('cpOutputs', []);
        }

        if (!partnerId && partnerId !== 0) { return; }

        this.partnerRequestInProcess = true;
        this.partnerId = partnerId;
        return true;
    },

    _partnerLoaded: function(event, details) {
        this.partnerRequestInProcess = false;

        if (this.editDialogOpened && !details.success) {
            this.editDialogOpened = false;
        }
    },

    _requestPartnership: function(partnershipId) {
        if (this.partnershipRequestInProcess || this.lastPartnershipId === partnershipId) { return; }
        this.lastPartnershipId = partnershipId;

        if (!this.editDialogOpened) {
            this.set('optionsModel.locations', []);
            this.set('locations', []);

            this.set('optionsModel.cp_output', null);
            this.set('cpOutputs', []);
        }

        if (!partnershipId && partnershipId !== 0) { return; }

        this.partnershipRequestInProcess = true;
        this.partnershipId = partnershipId;
        return true;
    },

    _partnershipLoaded: function(event, details) {
        this.partnershipRequestInProcess = false;
        this._updateLocations();
        this._updateCpOutputs();

        if (this.editDialogOpened && !details.success) {
            this.editDialogOpened = false;
        }
    },

    _updateLocations: function() {
        let sectors = this.get('partnership.sector_locations');
        if (!(sectors instanceof Array)) { return; }

        let locations = [];
        sectors.forEach((sector) => {
            if (sector && (sector.locations instanceof Array)) {
                locations = locations.concat(sector.locations);
            }
        });
        locations = _.sortBy(locations, ['name']);

        this.set('locations', locations);
    },

    _updateCpOutputs: function() {
        let resultLinks = this.get('partnership.result_links');
        if (!(resultLinks instanceof Array)) { return; }

        let cpIds = [];
        resultLinks.forEach((link) => {
            if (link && (link.cp_output || link.cp_output === 0)) {
                cpIds.push(link.cp_output);
            }
        });

        if (cpIds.length) {
            this._requestCpOutputs(cpIds);
        } else {
            this.editDialogOpened = false;
        }
    },

    _requestCpOutputs: function(cpIds) {
        if (this.cpRequestInProcess) { return; }

        this.cpRequestInProcess = true;
        this.cpIds = cpIds;
        return true;
    },

    _cpOutputsLoaded: function() {
        this.editDialogOpened = false;
        this.cpRequestInProcess = false;
    },

    _openDialog: function(index) {
        if (!this.deleteDialog) {
            this.editDialogOpened = true;
            this.editedItem = _.cloneDeep(this.dataItems[index]);
            this.originalEditedObj = _.cloneDeep(this.dataItems[index]);
        } else {
            let id = this.dataItems && this.dataItems[index] && this.dataItems[index].id;
            this.editedItem = {id};
        }

        this.editedIndex = index;
        this.dialogOpened = true;
    },

    _errorHandler: function(errorData) {
        this.requestInProcess = false;
        if (!errorData) { return; }
        let refactoredData = this.dialogOpened ? this.refactorErrorObject(errorData)[0] : this.refactorErrorObject(errorData);
        this.set('errors', refactoredData);
    },

    _getData: function() {
        let paths = ['implementing_partner.id', 'date', 'section.id', 'additional_information', '_delete'];
        let optionsPaths = ['partnership.id', 'cp_output.id', 'locations'];
        let allPaths = paths.concat(optionsPaths);

        let originalData = _.pick(this.originalEditedObj, allPaths);
        let currentData = _.pick(this.editedItem, paths);
        let optionsData = {};
        let changedData = {};

        optionsPaths.forEach((path) => {
            _.set(optionsData, path, _.get(this.optionsModel, path) || null);
        });
        _.assign(currentData, optionsData);

        allPaths.forEach((path) => {
            let originalValue = _.get(originalData, path);
            let currentValue = _.get(currentData, path);

            if (path === 'cp_output.id') {
                originalValue = +originalValue;
            }

            if (originalValue !== currentValue) {
                _.set(changedData, path, currentValue);
            }
        });

        let implementingPartner = _.get(changedData, 'implementing_partner.id') || undefined;
        let partnership = _.get(changedData, 'partnership.id');
        let cpOutput = _.get(changedData, 'cp_output.id');
        let section = _.get(changedData, 'section.id');
        let additionalInformation = _.get(changedData, 'additional_information');
        let date = _.get(changedData, 'date') || undefined;
        let _delete = _.get(changedData, '_delete');
        let locations = _.isEqual(originalData.locations, currentData.locations) ? [] : (currentData.locations || []);

        locations = locations.map((location) => {
            return location && location.id;
        });
        locations = locations.length ? locations : undefined;

        return {
            implementing_partner: implementingPartner,
            partnership,
            cp_output: cpOutput,
            section,
            additional_information: additionalInformation,
            date,
            locations,
            _delete,
        };
    },

    getActivitiesData: function() {
        if (!this.dialogOpened) { return null; }
        let data = this._getData();
        let dataValues = _.values(data);
        let dataNotEmpty = dataValues.some(value => value !== undefined);

        if (dataNotEmpty && !this.addDialog) {
            data.id = _.get(this.editedItem, 'id');
        }

        if (dataNotEmpty) {
            return [data];
        }

        return null;
    },
});
