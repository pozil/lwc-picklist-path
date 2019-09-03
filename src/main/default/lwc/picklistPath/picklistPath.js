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

    pickListValues;


    // App Builder parameter for qualified field name
    @api
    get fieldNameParam() {
        return this.qualifiedFieldName;
    }
    set fieldNameParam(value) {
        if (value.indexOf('.') === -1) {
            throw new Error('Picklist field name parameter is not fully qualified (eg: Account.Rating).');
        }
        this.qualifiedFieldName = value;
        this.fieldNames = [ value ];
    }


    // Extract record type id from object api name
    @wire(getObjectInfo, { objectApiName: '$objectApiName' })
    getObjectInfo({ error, data }) {
        if (data) {
            this.recordTypeId = data.defaultRecordTypeId;
        } else if (error) {
            const message = 'Failed to retrieve object info';
            console.error(message, JSON.stringify(error));
            throw new Error(message);
        }
    }

    // Extract picklist values from object type id and field name
    @wire(getPicklistValues, {
        recordTypeId: '$recordTypeId',
        fieldApiName: '$qualifiedFieldName'
    })
    getPicklistValues({ error, data }) {
        if (data) {
            this.pickListValues = data.values;
            this.refreshPathItems();
        } else if (error) {
            const message = 'Failed to retrieve picklist values';
            console.error(message, JSON.stringify(error));
            throw new Error(message);
        }
    }

    // Extract current picklist value for this record
    @wire(getRecord, { recordId: '$recordId', fields: '$fieldNames' })
    getRecord({ error, data }) {
        if (data) {
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

        // Update record with new value
        const fieldName = this.getFieldName();
        const recordInput = {
            Id: this.recordId
        };
        recordInput[fieldName] = value;
        updateRecord({ recordInput })
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
                this.dispatchEvent(
                    new ShowToastEvent({
                        title: 'Error updating record',
                        message: error.body.message,
                        variant: 'error'
                    })
                );
            });
    }

    refreshPathItems() {
        // Do nothing if we still haven't retrieved possible picklist values
        if (!this.pickListValues) {
            this.items = [];
            return;
        }

        let isCompleted = this.currentValue !== undefined && this.currentValue !== null;
        this.items = this.pickListValues.map(plValue => {
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
