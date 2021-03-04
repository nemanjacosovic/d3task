import React from "react";

export enum Seaport {
    FROM = 'From',
    TO = 'To',
}

export enum Text {
    PAGE_TITLE = 'SSG',
    PAGE_SUBTITLE = 'Seaport Shipping Graphs',
    SECTION_ROUTE_SELECTOR = 'Route selection',
    SECTION_ROUTE_BUTTON_SEARCH = 'Get prices',
    SECTION_ROUTE_SAVE_AS_PNG = 'Save as PNG',
    LOADING = 'Loading...',
    CLEAR = 'Clear',
    DATE_RANGE_FROM = 'Date range from',
    DATE_RANGE_TO = 'to',
    SET_DATE_FROM = 'Set date from',
    SET_DATE_TO = 'Set date to',
}

export enum GraphStatus {
    INITIAL = 'SSG Dashboard',
    SELECT_ROUTE = 'Select a route.',
    FETCH_IN_PROGRESS = 'Working...',
    FETCH_FAILED = 'Oh, no! Something went wrong.',
    FETCH_RECORDS_NOT_FOUND = 'Sorry, no records found.',
    FETCH_RECORDS_INCOMPLETE = 'Sorry, records are incomplete.',
    CLEARED = 'Dashboard is now cleared.',
    SELECT_ROUTE_OTHER = 'Try a different route.',
    EMPTY = '',
    PLEASE_WAIT = 'Please wait.'
}

export default Seaport;
