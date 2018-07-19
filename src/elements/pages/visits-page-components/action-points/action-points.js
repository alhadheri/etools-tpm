'use strict';

Polymer({
    is: 'action-points',

    behaviors: [
        etoolsAppConfig.globals,
        TPMBehaviors.DateBehavior,
        TPMBehaviors.StaticDataController,
        TPMBehaviors.CommonMethodsBehavior,
        TPMBehaviors.TextareaMaxRowsBehavior,
        TPMBehaviors.ActivityToDrD
    ],

    properties: {
        basePermissionPath: String,
        visitBase: {
            type: String,
            computed: '_computeVisitBase(visitId)'
        },
        title: String,
        itemModel: {
            type: Object,
            value: () => ({
                assigned_to: undefined,
                due_date: undefined,
                description: '',
                high_priority: false
            })
        },
        emptyObj: {
            type: Object,
            value: () => ({})
        },
        columns: {
            type: Array,
            value: () => [{
                'size': 18,
                'label': 'Reference Number #',
                'name': 'reference_number',
                'link': '*ap_link*',
                'ordered': 'desc',
                'path': 'reference_number',
                'target': '_blank',
                'class': 'with-icon'
            }, {
                'size': 7,
                'label': 'Related Task',
                'path': 'related_task',
                'name': 'related_task'
            }, {
                'size': 25,
                'label': 'Description',
                'labelPath': 'description',
                'name': 'description',
                'hideTooltip': true
            }, {
                'size': 20,
                'label': 'Assignee (Section / Office)',
                'path': 'computed_field',
                'html': true,
                'class': 'no-order'
            }, {
                'size': 10,
                'label': 'Status',
                'labelPath': 'status',
                'align': 'center',
                'path': 'status',
                'class': 'caps',
                'name': 'ap_status'
            }, {
                'size': 10,
                'label': 'Due Date',
                'labelPath': 'due_date',
                'path': 'due_date',
                'name': 'date',
                'align': 'center'
            }, {
                'size': 10,
                'label': 'Priority',
                'labelPath': 'high_priority',
                'path': 'priority',
                'align': 'center',
                'name': 'high_priority'
            }]
        },
        actionPoints: {
            type: Array,
            value: () => []
        },
        orderBy: {
            type: String,
            value: '-reference_number'
        },
        dialogTexts: {
            type: Object,
            value: () => ({
                add: {
                    title: 'Add Action Point',
                    button: 'Add'
                },
                edit: {
                    title: 'Edit Action Point',
                    button: 'Save'
                },
                view: {
                    title: 'View Action Point'
                }
            })
        }
    },

    observers: [
        'resetValidationErrors(dialogOpened)',
        '_errorHandler(errorObject)',
        'updateStyles(basePermissionPath, requestInProcess, editedItem.*)',
        'setPermissionPath(baseVisitPath)',
        '_addComputedField(actionPoints.*, tpmActivities)',
        '_orderChanged(orderBy, columns, actionPoints.*)'
    ],

    listeners: {
        'dialog-confirmed': '_startRequest',
        'ap-request-completed': '_requestCompleted',
        'edit-action-point': '_requestAPOptions'
    },

    ready: function() {
        this.usersList = (this.getData('unicefUsers') || []).map((user) => {
            let {first_name: firstName, last_name: lastName, id} = user;
            let name = firstName || lastName ? `${user.first_name} ${user.last_name}` : 'Unnamed User';
            return {id, name};
        });
        this.set('offices', this.getData('offices') || []);
        this.set('sections', this.getData('sections') || []);

        if (!this.collectionExists('edited_ap_options')) {
            this._addToCollection('edited_ap_options', {});
        }
    },

    setPermissionPath: function(basePath) {
        this.basePermissionPath = basePath ? `${basePath}_ap` : '';
    },

    _computeVisitBase: function(id) {
        return id ? `visit_${id}` : '';
    },

    _addComputedField: function() {
        this.itemsToDisplay = this.actionPoints.map((item) => {
            item.priority = item.high_priority && 'High' || ' ';
            item.computed_field = `<b>${item.assigned_to.name}</b> <br>(${item.section.name} / ${item.office.name})`;

            let relatedTask = _.findIndex(this.tpmActivities, (activity) => item.tpm_activity === activity.id);
            if (~relatedTask) {
                item.related_task = `000${relatedTask + 1}`.slice(-4);
            }
            return item;
        });
    },

    _orderChanged: function(newOrder, columns) {
        if (!newOrder || !(columns instanceof Array)) { return false; }

        let direction = 'asc';
        let name = newOrder;

        if (name.startsWith('-')) {
            direction = 'desc';
            name = name.slice(1);
        }

        columns.forEach((column, index) => {
            if (column.name === name) {
                this.set(`columns.${index}.ordered`, direction);
            } else {
                this.set(`columns.${index}.ordered`, false);
            }
        });

        let sorted = _.sortBy(this.actionPoints, (item) => item[name]);
        this.itemsToDisplay = direction === 'asc' ? sorted : sorted.reverse();
    },

    _requestAPOptions: function(event) {
        let item = event && event.model && event.model.item,
            index = this.actionPoints.indexOf(item);

        if ((!index && index !== 0) || !~index) {
            throw 'Can not find data';
        }

        let itemForEdit = _.get(this, `actionPoints.${index}`);
        this.fire('global-loading', {type: 'get-ap-options', active: true, message: 'Loading data...'});

        let url = this.getEndpoint('visitDetails', {id: this.visitId}).url;
        this.apOptionUrl = `${url}action-points/${itemForEdit.id}/`;
        this._itemForEdit = itemForEdit;
    },

    _handleOptionResponse: function(event, detail) {
        this.fire('global-loading', {type: 'get-ap-options'});
        this.apOptionUrl = null;

        if (detail && detail.actions) {
            this._updateCollection('edited_ap_options', detail.actions);
        }
        let itemForEdit = this._itemForEdit;
        this._itemForEdit = null;

        let popupType = this.collectionExists('edited_ap_options.PUT') ? 'edit' : 'view';
        this._openPopup({itemForEdit, popupType, permissionBase: 'edited_ap_options'});
    },

    _openPopup: function(data = {}) {
        let {itemForEdit, popupType = 'add', permissionBase = this.basePermissionPath} = data;

        this.editedApBase = '';
        this.editedApBase = permissionBase;
        if (itemForEdit) {
            this.popupType = popupType;
            this.editedItem = _.cloneDeep(itemForEdit);
        } else {
            this.popupType = popupType;
            this.editedItem = _.cloneDeep(this.itemModel);
        }

        this.originalEditedObj = _.cloneDeep(this.editedItem);
        this.dialogTitle = _.get(this, `dialogTexts.${this.popupType}.title`);
        this.confirmBtnText = _.get(this, `dialogTexts.${this.popupType}.button`);
        this.hideConfirmBtn = !_.get(this, `dialogTexts.${this.popupType}.button`);
        this.dialogOpened = true;
    },

    checkDialogType: function(type) {
        return this.dialogOpened && type === this.popupType;
    },

    canNotAddAP: function(basePath) {
        if (!basePath) { return true; }

        let readOnly = this.isReadonly(`${basePath}.POST`);
        if (readOnly === null) { readOnly = true; }

        return readOnly;
    },

    canBeEdited: function(status) {
        return status !== 'completed';
    },

    _startRequest: function() {
        if (!this.validate()) { return; }
        this.requestInProcess = true;

        let apData = this.getActionsData();

        if (apData) {
            let method = apData.id ? 'PATCH' : 'POST';
            this.requestData = {method, apData};
        } else {
            this._requestCompleted(null, {success: true});
        }

    },

    validate: function() {
        let elements = Polymer.dom(this.root).querySelectorAll('.validate-input'),
            valid = true;

        Array.prototype.forEach.call(elements, (element) => {
            if (element.required && !element.validate()) {
                element.invalid = 'This field is required';
                element.errorMessage = 'This field is required';
                valid = false;
            }
        });

        return valid;
    },

    getActionsData: function() {
        if (!this.dialogOpened) { return null; }

        if (this.editedItem.due_date === '') { this.editedItem.due_date = null; }

        let data = _.pickBy(this.editedItem, (value, fieldName) => {
            let isObject = _.isObject(value) && !_.isArray(value);
            if (isObject) {
                return value.id !== _.get(this, `originalEditedObj.${fieldName}.id`);
            } else {
                return !_.isEqual(value, this.originalEditedObj[fieldName]);
            }
        });

        _.each(['assigned_to', 'office', 'section'], (field) => {
            if (data[field]) { data[field] = data[field].id; }
        });
        if (this.editedItem.id && !_.isEmpty(data)) { data.id = this.editedItem.id; }

        return _.isEmpty(data) ? null : data;
    },

    _requestCompleted: function(event, detail) {
        this.requestInProcess = false;
        if (detail && detail.success) {
            this.dialogOpened = false;
        }
    }

});
