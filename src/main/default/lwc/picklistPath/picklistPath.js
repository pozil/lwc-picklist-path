/* eslint-disable no-console */
import { LightningElement, track, api, wire } from 'lwc';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import { getRecord, updateRecord } from 'lightning/uiRecordApi';
import { getPicklistValues, getObjectInfo } from 'lightning/uiObjectInfoApi';


export default class Path extends LightningElement {
    @api recordId;
    @api objectApiName;

    @track recordTypeId;
    @track qualifiedFieldName;
    @track fieldNames = [];

    @track currentValue;
    @track items = [];

    picklistValues;
    defaultRecordTypeId;

    // App Builder parameter for qualified field name
    // We use a getter/setter because we need to save the value twice:
    // - as a string for calling getObjectInfo wire
    // - as an array for calling getRecord wire
    @api
    get fieldNameParam() {
        return this.qualifiedFieldName;
    }
    set fieldNameParam(value) {
        if (value.indexOf('.') === -1) {
            throw new Error('Picklist field name must be qualified (eg: Account.Rating).');
        }
        this.qualifiedFieldName = value;
        this.fieldNames = [ value ];
    }

    // Extract object information including default record type id
    @wire(getObjectInfo, { objectApiName: '$objectApiName' })
    objectInfo;

    // Extract picklist values
    @wire(getPicklistValues, {
        recordTypeId: '$recordTypeId',
        fieldApiName: '$qualifiedFieldName'
    })
    getPicklistValues({ error, data }) {
        if (data) {
            this.picklistValues = data.values;
            this.refreshPathItems();
        } else if (error) {
            const message = 'Failed to retrieve picklist values';
            console.error(message, JSON.stringify(error));
            throw new Error(message);
        }
    }

    // Extract current picklist value for this record
    @wire(getRecord, {
        recordId: '$recordId',
        fields: '$fieldNames'
    })
    getRecord({ error, data }) {
        if (data) {
            // Check if record data includes record type
            if (data.recordTypeInfo) {
                this.recordTypeId = data.recordTypeInfo.recordTypeId;
            } else { // Use default record type
                this.recordTypeId = this.objectInfo.data.defaultRecordTypeId;
            }
            // Get current picklist value
            const fieldName = this.getFieldName();
            this.currentValue = data.fields[fieldName].value;
            this.refreshPathItems();
        } else if (error) {
            const message = 'Failed to retrieve record data';
            console.error(message, JSON.stringify(error));
            throw new Error(message);
        }
    }

    handlePathItemClick(event) {
        event.preventDefault();
        event.stopPropagation();

        // Ignore clicks on curent value
        const { value } = event.currentTarget.dataset;
        if (value === this.currentValue) {
            return;
        }

        // Prepare updated record fields
        const fieldName = this.getFieldName();
        const fields = {
            Id: this.recordId
        };
        fields[fieldName] = value;
        const recordInput = { fields };
        // Update record
        updateRecord(recordInput)
            .then(() => {
                this.dispatchEvent(
                    new ShowToastEvent({
                        title: 'Success',
                        message: 'Record updated',
                        variant: 'success'
                    })
                );
            })
            .catch(error => {
                const message = error.body ? error.body.message : error;
                console.error(error);
                this.dispatchEvent(
                    new ShowToastEvent({
                        title: 'Error updating record',
                        message,
                        variant: 'error'
                    })
                );
            });
    }

    refreshPathItems() {
        // Do nothing if we still haven't retrieved possible picklist values
        if (!this.picklistValues) {
            this.items = [];
            return;
        }

        let isCompleted = this.currentValue !== undefined && this.currentValue !== null;
        this.items = this.picklistValues.map(plValue => {
            const isCurrent =
                this.currentValue && plValue.value === this.currentValue;
            if (isCurrent) {
                isCompleted = false;
            }
            const item = {
                label: plValue.label,
                value: plValue.value,
                isCurrent,
                isCompleted
            };
            item.cssClasses = this.getPathItemCssClasses(item);
            return item;
        });
    }

    getFieldName() {
        return this.qualifiedFieldName.substring(this.qualifiedFieldName.indexOf('.') +1);
    }

    getPathItemCssClasses(item) {
        let cssClasses = 'slds-path__item';
        if (item.isCurrent) {
            cssClasses += ' slds-is-current slds-is-active';
        }
        if (!item.isCurrent && item.isCompleted) {
            cssClasses += ' slds-is-complete';
        } else {
            cssClasses += ' slds-is-incomplete';
        }
        return cssClasses;
    }
}
