export enum Seaport {
    FROM = 'From',
    TO = 'To',
}

export enum GraphStatus {
    INITIAL = 'SSG Dashboard',
    SELECT_ROUTE = 'Select a route.',
    FETCH_STARTED = 'Loading...',
    FETCH_FAILED = 'Oh, no! Something went wrong.',
    FETCH_NO_RECORDS = 'Sorry, no records found.',
    CLEARED = 'Dashboard is now cleared.',
    SELECT_ROUTE_OTHER = 'Try a different route.',
    EMPTY = ''
}

export default Seaport;
