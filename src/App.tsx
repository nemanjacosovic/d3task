import React, {useEffect, useRef, useState} from 'react';

import axios from 'axios';
import * as d3 from 'd3';
import { v4 as uuidv4 } from 'uuid';
import { saveSvgAsPng } from 'save-svg-as-png';

import CountryFlag from 'country-flag-icons/react/3x2';
import DateFnsUtils from '@date-io/date-fns';

import {
    Avatar,
    Button,
    CircularProgress,
    Collapse,
    Container,
    Dialog,
    DialogTitle,
    Grid,
    IconButton,
    List,
    ListItem,
    ListItemAvatar,
    ListItemText,
    Paper
} from '@material-ui/core';
import Alert from '@material-ui/lab/Alert';
import {
    MuiPickersUtilsProvider,
    KeyboardDatePicker,
} from '@material-ui/pickers';
import {
    Clear,
    Close,
    DirectionsBoat,
    DirectionsBoatOutlined,
    InsertChartOutlined,
    GetApp,
    SwapHoriz
} from '@material-ui/icons';

// Constants
import { GraphStatus, Seaport, Text } from './constants/CommonConstants';

// Utils and Config
import API_CONFIG from './config';

// Style
import './App.scss';

// Interfaces
interface ISeaport {
    code: string;
    name: string;
}

interface IDate {
    day: Date | null;
    value: number
}

interface IMarkerData {
    rValue: number,
    cyValue: number[],
    fillValue: string
}

interface IGraphData {
    day: string;
    low: number;
    mean: number;
    high: number;
}

interface ID3Graph {
    data?: number[];
    height: number;
    width: number;
    className?: string;
}

function App() {
    const [isLoading, setIsLoading] = useState(true);
    const [isApiError, setIsApiError] = useState(false);
    const [isAlertDismissed, setIsAlertDismissed] = useState(false);
    const [isGetGraphDataActive, setIsGetGraphDataActive] = useState(false);
    const [isGraphDataIncomplete, setisGraphDataIncomplete] = useState(false);
    const [apiErrorMessage, setApiErrorMessage] = useState('');
    const [seaportList, setSeaportList] = useState([]);
    const [graphData, setGraphData] = useState<IGraphData[]>([]);
    const [graphDataLength, setGraphDataLength] = useState(0);
    const [seaportSelectedFrom, setSeaportSelectedFrom] = useState<ISeaport | null>(null);
    const [seaportSelectedTo, setSeaportSelectedTo] = useState<ISeaport | null>(null);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [dialogOpenType, setDialogOpenType] = useState('');
    const [isSearchDisabled, setIsSearchDisabled] = useState(true);
    const [isSwapDisabled, setIsSwapDisabled] = useState(true);
    const [graphDataDay, setGraphDataDay] = useState<any[]>([]);
    const [graphDataLow, setGraphDataLow] = useState<any[]>([]);
    const [graphDataMean, setGraphDataMean] = useState<any[]>([]);
    const [graphDataHigh, setGraphDataHigh] = useState<any[]>([]);
    const [selectedDateFrom, setSelectedDateFrom] = React.useState<Date | string | null>();
    const [selectedDateTo, setSelectedDateTo] = React.useState<Date | string | null>();

    const d3Graph = useRef(null);

    useEffect(() => {
        if (seaportList.length === 0) {
            getSeaportList().then(() => {
                setIsLoading(false);
            });
        }

        setGraphDataLength(graphData.length);
    }, [seaportList, graphData]);

    useEffect(() => {
        if (graphDataLength > 0) {
            setSelectedDateFrom(graphData[0]?.day);
            setSelectedDateTo(graphData[graphDataLength - 1]?.day)
        }

        parseGraphData();
    }, [graphData, graphDataLength])

    useEffect(() => {
        if (!!seaportSelectedFrom?.code && !!seaportSelectedTo?.code) {
            setIsSearchDisabled(false);
        }
    }, [seaportSelectedFrom, seaportSelectedTo]);

    // Suggestion: Case when there is data point missing in Low, Mean and/or High
    useEffect(() => {
        if (graphDataLength > 0) {
            const parsedGraphDataGroup = () => [graphDataDay, graphDataLow, graphDataMean, graphDataHigh].map((graphDataSet) => graphDataSet.includes(null));
            setisGraphDataIncomplete(parsedGraphDataGroup().includes(true));
        }
    }, [graphDataDay, graphDataLow, graphDataMean, graphDataHigh]);

    // SETUP API calls
    const axiosToAWS = axios.create({
        baseURL: API_CONFIG.BASE_URL,
        headers: {
            'x-api-key': API_CONFIG.API_KEY
        }
    });

    // GET Seaports
    const getSeaportList = () => axiosToAWS
        .get(API_CONFIG.API_PORTS)
        .then(function (response) {
            setSeaportList(response.data);
        })
        .catch(function (error) {
            setIsApiError(true);
            setApiErrorMessage(error.message);
        });

    // GET Graph Data
    const getGraphData = () => {
        if (isSearchDisabled) {
            return null;
        }

        setIsApiError(false);
        setIsGetGraphDataActive(true);

        return axiosToAWS
            .get(API_CONFIG.API_RATES, {
                params: {
                    origin: seaportSelectedFrom?.code,
                    destination: seaportSelectedTo?.code
                    // date_from: seaportSelectedFrom
                    // date_to: seaportSelectedTo
                }
            })
            .then(function (response) {
                setGraphData(response.data);
            })
            .catch(function (error) {
                setGraphData([]);
                setIsApiError(true);
                setApiErrorMessage(error.message);
            })
            .then(() => {
                setIsGetGraphDataActive(false);
            });
    };

    // CLEAR Search
    const clearSearch = () => {
        setIsApiError(false);
        setIsAlertDismissed(true);
        setGraphData([]);
        setSelectedDateFrom(null);
        setSelectedDateTo(null);
        setSeaportSelectedFrom(null);
        setSeaportSelectedTo(null);
        setIsSearchDisabled(true);
        setIsSwapDisabled(true);
    }

    // PARSE Graph Data
    const parseGraphData = () => {
        const dataDay: any[] = [];
        const dataLow: any[] = [];
        const dataMean: any[] = [];
        const dataHigh: any[] = [];

        graphData.map((dataPoint: IGraphData) => {
            dataDay.push(dataPoint?.day);
            dataLow.push(dataPoint?.low);
            dataMean.push(dataPoint?.mean);
            dataHigh.push(dataPoint?.high);
        })

        setGraphDataDay(dataDay);
        setGraphDataLow(dataLow);
        setGraphDataMean(dataMean);
        setGraphDataHigh(dataHigh);
    }

    // OPEN Dialog
    const handleDialogOpen = (portRoute: string) => {
        setIsApiError(false);
        setIsDialogOpen(true);
        setDialogOpenType(portRoute);
    };

    // CLOSE Dialog
    const handleDialogClose = () => {
        setIsDialogOpen(false);
    };

    // SELECTED Dialog
    const handleDialogSelectedValue = (seaportSelected: ISeaport) => {
        dialogOpenType === Seaport.FROM ? setSeaportSelectedFrom(seaportSelected) : setSeaportSelectedTo(seaportSelected);
        setIsSwapDisabled(false);
        handleDialogClose();
    };

    // SWITCH Seaport
    const handleSwitchSeaports = () => {
        setIsApiError(false);
        setSeaportSelectedFrom(seaportSelectedTo);
        setSeaportSelectedTo(seaportSelectedFrom);
    };

    // Dismissed alert
    const handleAlertDismiss = () => {
        setIsApiError(false);
        setIsAlertDismissed(true);
    };

    // D3 Graph
    const D3Graph = (props: ID3Graph) => {
        const { height, width, className } = props;
        const graphMargins = { top: 15, right: 30, bottom: 60, left: 60 }
        const graphWidth = width - graphMargins.right - graphMargins.left;
        const graphHeight = height - graphMargins.top - graphMargins.bottom;

        useEffect(() => {
            if (graphDataLength !== 0) {
                // X scale
                const xScaleOffset = new Date(new Date(graphDataDay[0]).getTime() - 86400000);
                const xScale = d3.scaleTime()
                    .domain([xScaleOffset, new Date(graphDataDay[graphDataDay.length - 1])])
                    .range([0, graphWidth]);

                // Y scale
                const yScaleLow = d3.max(graphDataLow);
                const yScaleHigh = d3.max(graphDataHigh);
                const yScale = d3.scaleLinear()
                    .domain([yScaleLow - 100, yScaleHigh + 100])
                    .range([graphHeight, 0]);

                // Main node
                const d3Main = d3.select(d3Graph.current)
                    .attr('width', width)
                    .attr('height', height);

                // Entry node
                const svgGraph = d3Main
                    .append('g')
                    .attr('width', graphWidth)
                    .attr('height', graphHeight)
                    .attr('transform', `translate(${graphMargins.left}, ${graphMargins.top})`);

                // X axis
                const xAxisGroup = d3Main.append('g')
                    .attr('transform', `translate(${graphMargins.left}, ${graphHeight + graphMargins.top})`)
                const xAxis = d3.axisBottom(xScale);

                xAxisGroup.call(xAxis);

                // Y axis
                const yAxisGroup = d3Main.append('g')
                    .attr('transform', `translate(${graphMargins.left}, ${graphMargins.top})`);
                const yAxis = d3.axisLeft(yScale)
                    .ticks(6)
                    .tickFormat(d => `${d} €`);

                yAxisGroup.call(yAxis);

                // Markers
                const markers = svgGraph.selectAll('circle')
                    .data(graphData)

                const makerParserData = [
                    {
                        rValue: 4,
                        cyValue: graphDataLow,
                        color: '#028090',
                        lineStroke: 1
                    },
                    {
                        rValue: 4,
                        cyValue: graphDataMean,
                        color: '#DEB841',
                        lineStroke: 1
                    },
                    {
                        rValue: 4,
                        cyValue: graphDataHigh,
                        color: '#F45B69',
                        lineStroke: 1
                    }
                ];

                makerParserData.map(markerData => {
                    markers.enter()
                        .append('circle')
                        .attr('r', markerData.rValue)
                        .attr('cx', (d, i, n) => xScale(new Date(graphDataDay[i])))
                        .attr('cy', (d, i, n) => yScale(markerData.cyValue[i]))
                        .attr('fill', markerData.color)

                    d3.line()
                        .x((d, i) => xScale(new Date(graphDataDay[i])))
                        .y((d, i) => yScale(markerData.cyValue[i]));

                    d3Main.append('path')
                        .attr('fill', 'none')
                        .attr('stroke', markerData.color)
                        .attr('stroke-width', markerData.lineStroke)
                        .attr('d', function(){
                            return d3.line()
                                .x(function(d, i) { return xScale(new Date(graphDataDay[i])) + graphMargins.left; })
                                .y(function(d, i) { return yScale(markerData.cyValue[i]) + graphMargins.top; })
                                (markerData.cyValue)
                        })
                });

                // Adjust X Axis
                xAxisGroup.selectAll('text')
                    .attr('transform', 'rotate(-30)')
                    .attr('text-anchor', 'end')

                // Hover IN
                const handleMouseOver = (event: { currentTarget: any; }) => {
                    d3.select(event.currentTarget)
                        .transition()
                        .duration(300)
                        .attr('r', 8);
                }

                // Hover OUT
                const handleMouseOut = (event: { currentTarget: any; }) => {
                    d3.select(event.currentTarget)
                        .transition()
                        .delay(300)
                        .duration(500)
                        .attr('r', 4);
                }

                d3Main.selectAll('circle')
                    .on('mouseover', handleMouseOver)
                    .on('mouseleave', handleMouseOut);
            }

        }, [graphData, graphDataLength]);

        return (
            <svg className={className} ref={d3Graph}/>
        );
    };

    // HEADER
    const _renderHeader = () => {
        return (
            <div className='ssg-header'>
                <h1 className='ssg-header__title'>{Text.PAGE_TITLE}<small>{Text.PAGE_SUBTITLE}</small>
                    <InsertChartOutlined className='ssg-header__title-icon'/>
                </h1>
            </div>
        )
    };

    // ROUTE SELECTOR
    const _renderRouteSelector = () => {
        return (
            <>
                <h2 className='ssg-main__title'>{Text.SECTION_ROUTE_SELECTOR}</h2>
                <Grid container spacing={2} className='ssg-main__route-selector'>
                    <Grid item xs={3}>
                        {_renderRouteSelectorButton(Seaport.FROM, seaportSelectedFrom)}
                    </Grid>
                    <Grid item>
                        <Button
                            className='ssg-main__route-selector-button-swap'
                            color='primary'
                            disabled={isSwapDisabled}
                            onClick={() => handleSwitchSeaports()}
                            variant='outlined'
                        >
                            <SwapHoriz/>
                        </Button>
                    </Grid>
                    <Grid item xs={3}>
                        {_renderRouteSelectorButton(Seaport.TO, seaportSelectedTo)}
                    </Grid>
                    <Grid item xs={3}>
                        <Button
                            className='ssg-main__route-selector-button--adjust'
                            color='primary'
                            disabled={isSearchDisabled}
                            disableElevation
                            onClick={() => getGraphData()}
                            variant='contained'
                        >
                            {isGetGraphDataActive ? Text.LOADING : Text.SECTION_ROUTE_BUTTON_SEARCH}
                        </Button>
                    </Grid>
                    <Grid item>
                        <Button
                            className='ssg-main__route-selector-button-clear'
                            color='default'
                            disabled={isSwapDisabled}
                            onClick={() => clearSearch()}
                            variant='outlined'
                        >
                            <Clear/>
                            {Text.CLEAR}
                        </Button>
                    </Grid>
                </Grid>
            </>
        )
    };

    // ROUTE SELECTOR BUTTON
    const _renderRouteSelectorButton = (seaportRoute: string, seaportRouteSelected: ISeaport | null) => {
        const className = 'ssg-main__route-selector-button--icon';
        const renderShipIcon = () => {
            if (seaportRoute === Seaport.TO) {
                return <DirectionsBoatOutlined className={className}/>
            }
            return <DirectionsBoat className={className}/>
        }

        return (
            <Button
                className='ssg-main__route-selector-button ssg-main__route-selector-button--adjust'
                color='primary'
                onClick={() => handleDialogOpen(seaportRoute)}
                variant='outlined'
            >
                {renderShipIcon()}
                <span className='ssg-main__route-selector-info-flag'>{countryFlagComponent(seaportRouteSelected)}</span>
                <div className='ssg-main__route-selector-info-text'>
                    <span className='ssg-main__route-selector-info-name'>
                        {seaportRouteSelected?.name ? seaportRouteSelected?.name : seaportRoute}
                    </span>
                    <span className='ssg-main__route-selector-info-text-code'>
                        {seaportRouteSelected?.code ?? seaportRouteSelected?.code}
                    </span>
                </div>
            </Button>
        )
    }

    // ROUTE SELECTOR BUTTON COUNTRY FLAG
    const countryFlagComponent = (seaport: ISeaport | null) => {
        if (!seaport) {
            return null;
        }

        const CountryFlagComponent = seaport?.code.substring(0, 2)
            .split('.')
            .reduce((o, i) => o[i], CountryFlag);
        return <CountryFlagComponent key={seaport.name}/>
    }

    // ERRORS
    const _renderRouteSelectorErrors = () => {
        return (
            <div className='ssg-main__alert'>
                <Collapse in={isApiError}>
                    <Alert
                        className='ssg-main__alert-error'
                        severity='error'
                        action={
                            <IconButton
                                aria-label='close'
                                color='inherit'
                                size='small'
                                onClick={() => handleAlertDismiss()}
                            >
                                <Close fontSize='inherit' />
                            </IconButton>
                        }
                    >
                        {apiErrorMessage}
                    </Alert>
                </Collapse>
            </div>
        )
    }

    // ENTER GRAPH
    const _renderPrimaryGraph = () => {
        return (
            <Paper className='ssg-main__graph'>
                {graphData.length === 0 || isGraphDataIncomplete ? null : <D3Graph width={852} height={320} className='ssg-main__graph-d3js'/> }
                {_renderGraphDataStatusMessage()}
            </Paper>
        )
    };

    // GRAPH STATUS MESSAGES
    const _renderGraphDataStatusMessage = () => {
        let statusTextPrimary = GraphStatus.INITIAL;
        let statusTextSecondary = GraphStatus.SELECT_ROUTE;

        if (isGraphDataIncomplete && !isGetGraphDataActive) {
            statusTextPrimary = GraphStatus.FETCH_RECORDS_INCOMPLETE;
            statusTextSecondary = GraphStatus.SELECT_ROUTE_OTHER;
        }

        if (!isApiError && !isGetGraphDataActive && graphDataLength === 0 && !isAlertDismissed) {
            statusTextPrimary = GraphStatus.FETCH_RECORDS_NOT_FOUND;
            statusTextSecondary = GraphStatus.SELECT_ROUTE_OTHER;
        }

        if (isApiError) {
            statusTextPrimary = GraphStatus.FETCH_FAILED;
            statusTextSecondary = GraphStatus.SELECT_ROUTE_OTHER;
        }

        if (isGetGraphDataActive) {
            statusTextPrimary = GraphStatus.FETCH_IN_PROGRESS;
            statusTextSecondary = GraphStatus.PLEASE_WAIT;
        }

        return (
            <div className='ssg-main__graph-status-message'>
                <h1 className='ssg-main__graph-status-message-title'>{statusTextPrimary}<small className='ssg-main__graph-status-message-subtitle'>{statusTextSecondary}</small></h1>
            </div>
        )
    }

    // GRAPH OPTIONS
    const _renderGraphOptions = () => {
        const handleDateChangeFrom = (date: Date | null) => setSelectedDateFrom(date);
        const handleDateChangeTo = (date: Date | null) => setSelectedDateTo(date);
        const commonProps = {
            disableToolbar: true,
            autoOk: true,
            format: 'yyyy-MM-dd',
            id: 'date-picker-inline',
            className: 'ssg-options__time-range--date'
        }

        return (
            <Collapse in={graphDataLength > 0} className='ssg-options'>
                <Grid container spacing={5}>
                    <Grid item xs={9}>
                        <MuiPickersUtilsProvider utils={DateFnsUtils}>
                            <Grid container className='ssg-options__time-range'>
                                {Text.DATE_RANGE_FROM}
                                <KeyboardDatePicker
                                    {...commonProps}
                                    variant='inline'
                                    margin='normal'
                                    value={selectedDateFrom}
                                    onChange={handleDateChangeFrom}
                                    KeyboardButtonProps={{
                                        'aria-label': Text.SET_DATE_FROM,
                                    }}
                                />
                                {Text.DATE_RANGE_TO}
                                <KeyboardDatePicker
                                    {...commonProps}
                                    variant='inline'
                                    margin='normal'
                                    value={selectedDateTo}
                                    onChange={handleDateChangeTo}
                                    KeyboardButtonProps={{
                                        'aria-label': Text.SET_DATE_TO,
                                    }}
                                />.
                            </Grid>
                        </MuiPickersUtilsProvider>
                    </Grid>
                    <Grid item xs={3} style={{textAlign: 'right'}}>
                        <Button
                            color='default'
                            disabled={isSearchDisabled}
                            disableElevation
                            onClick={() => saveGraphToPng()}
                            variant='contained'
                            aria-label={Text.SECTION_ROUTE_SAVE_AS_PNG}
                        >
                            <GetApp className='ssg-options__button--icon'/>
                            {Text.SECTION_ROUTE_SAVE_AS_PNG}
                        </Button>
                    </Grid>
                </Grid>
            </Collapse>
        )
    };

    // const _renderSecondaryGraph = () => {};

    // FOOTER
    const _renderFooter = () => {
        return (
            <footer className='ssg-footer'>
                <span>Copyright &copy; 2021 {Text.PAGE_TITLE} by Auxburgo</span>
            </footer>
        )
    };

    // HELPER / UTILITY
    const randomNumber = (maxNum: number) => {
        return Math.floor(Math.random() * Math.floor(maxNum));
    };

    const saveGraphToPng = () => {
        const setFileNamePart = `${seaportSelectedFrom?.code}-${seaportSelectedTo?.code}${selectedDateFrom && '-' + selectedDateFrom}${selectedDateTo && '-' + selectedDateTo}-${uuidv4()}`;
        return saveSvgAsPng(document.querySelector('.ssg-main__graph-d3js'),`ssg-export-${setFileNamePart}.png`);
    }

    // ROUTE SELECT DIALOG
    const _renderRouteSelectDialog = () => {
        if (!isDialogOpen || seaportList.length === 0) {
            return null;
        }

        return (
            <Dialog aria-labelledby='Select seaport' className='ssg-dialog' open={isDialogOpen} onClose={handleDialogClose}>
                <DialogTitle className='ssg-dialog__title' id='Select seaport origin'>Select <strong>from</strong> seaport
                    <Button
                        aria-label='close'
                        className='ssg-dialog__title-close'
                        variant='contained'
                        color='default'
                        disableElevation
                        onClick={() => handleDialogClose()}
                    >
                        <Close fontSize='inherit' />
                    </Button>
                </DialogTitle>
                <List className='ssg-dialog__list'>
                    {seaportList.map((seaport: ISeaport) => {
                        if (!seaport.code ||
                            !seaport.name ||
                            seaport?.code === seaportSelectedFrom?.code ||
                            seaport?.code === seaportSelectedTo?.code) {
                            return null;
                        }

                        return (
                            <ListItem button onClick={() => handleDialogSelectedValue(seaport)} key={seaport.code}>
                                <ListItemAvatar>
                                    <Avatar variant='rounded' style={{width: 36, height: 24}}>
                                        {countryFlagComponent(seaport)}
                                    </Avatar>
                                </ListItemAvatar>
                                <ListItemText primary={seaport.name}/>
                            </ListItem>
                        )
                    })}
                </List>
            </Dialog>
        );
    };

    if (isLoading) {
        return (
            <div className='ssg-loading'>
                <div className='ssg-loading__container'>
                    <span className='ssg-loading__text'>
                        {Text.LOADING}
                    </span>
                    <CircularProgress className='ssg-loading__spinner'/>
                </div>
            </div>
        )
    }

    return (
        <div className={`ssg-wrapper bg-ver-0 bg-ver-${randomNumber(4)}`}>
            <div className='ssg'>
                <Container maxWidth='md' >
                    {_renderHeader()}
                    <Paper className='ssg-main'>
                        {_renderRouteSelector()}
                        {_renderRouteSelectorErrors()}
                        {_renderPrimaryGraph()}
                        {_renderGraphOptions()}
                    </Paper>
                    {_renderFooter()}
                </Container>
            </div>
            {_renderRouteSelectDialog()}
        </div>
    );
}

export default App;
