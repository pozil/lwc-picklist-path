/* eslint-disable no-console */
import { LightningElement, track, api, wire } from 'lwc';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import { getRecord, updateRecord } from 'lightning/uiRecordApi';
import { getPicklistValues, getObjectInfo } from 'lightning/uiObjectInfoApi';


export default class Path extends LightningElement {
    // Page context
    @api recordId;
    @api objectApiName;

    // App Builder parameter for qualified field name
    @api qualifiedFieldName;

    @track recordTypeId;
    @track picklistValue;
    @track pathItems = [];
    @track errorMessage;

    picklistValues;
    defaultRecordTypeId;


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
            const message = `Failed to retrieve picklist values. ${this.reduceErrors(error)}`;
            console.error(message, JSON.stringify(error));
            this.errorMessage = message;
        }
    }

    // Extract current picklist value for this record
    @wire(getRecord, {
        recordId: '$recordId',
        fields: '$qualifiedFieldName'
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
            this.picklistValue = data.fields[fieldName].value;
            this.refreshPathItems();
        } else if (error) {
            const message = `Failed to retrieve record data. ${this.reduceErrors(error)}`;
            console.error(message, JSON.stringify(error));
            this.errorMessage = message;
        }
    }

    handlePathItemClick(event) {
        event.preventDefault();
        event.stopPropagation();

        // Ignore clicks on curent value
        const { value } = event.currentTarget.dataset;
        if (value === this.picklistValue) {
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
                const message = this.reduceErrors(error);
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
            this.pathItems = [];
            return;
        }

        let isCompleted = this.picklistValue !== undefined && this.picklistValue !== null;
        this.pathItems = this.picklistValues.map(plValue => {
            const isCurrent =
                this.picklistValue && plValue.value === this.picklistValue;
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

    reduceErrors(errors) {
        if (!Array.isArray(errors)) {
            errors = [errors];
        }
    
        return (
            errors
                // Remove null/undefined items
                .filter(error => !!error)
                // Extract an error message
                .map(error => {
                    // UI API read errors
                    if (Array.isArray(error.body)) {
                        return error.body.map(e => e.message);
                    }
                    // UI API DML, Apex and network errors
                    else if (error.body && typeof error.body.message === 'string') {
                        return error.body.message;
                    }
                    // JS errors
                    else if (typeof error.message === 'string') {
                        return error.message;
                    }
                    // Unknown error shape so try HTTP status text
                    return error.statusText;
                })
                // Flatten
                .reduce((prev, curr) => prev.concat(curr), [])
                // Remove empty strings
                .filter(message => !!message)
        );
    }
}
