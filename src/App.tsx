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
import { GraphStatus, Seaport, Text } from "./constants/CommonConstants";

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
    const [isGetGraphDataActive, setIsGetGraphDataActive] = useState(false);
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
            getSeaportList();
            setIsLoading(false);
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

    useEffect(() => {
        // TODO Case when there is no data in entire range for Low, Mean and/or High
        // TODO Case when there is data point missing in Low, Mean and/or High
        // console.log(graphDataDay, graphDataLow, graphDataMean, graphDataHigh);
    }, [graphDataDay, graphDataLow, graphDataMean, graphDataHigh])

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

    // CLEAR Search
    const clearSeach = () => {
        setIsApiError(false);
        setGraphData([]);
        setSelectedDateFrom(null);
        setSelectedDateTo(null);
        setSeaportSelectedFrom(null);
        setSeaportSelectedTo(null);
        setIsSearchDisabled(true);
        setIsSwapDisabled(true);
    }

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

    // D3 Graph
    const D3Graph = (props: ID3Graph) => {
        const { height, width, className } = props;
        const graphMargins = {
            top: 15,
            right: 30,
            bottom: 60,
            left: 60
        }

        const graphWidth = width - graphMargins.right - graphMargins.left;
        const graphHeight = height - graphMargins.top - graphMargins.bottom;

        //@ts-ignore
        const handleMouseOver = (event, d) => {
            d3.select(event.currentTarget).transition().duration(300).attr('fill', 'deepskyblue');
        }

        //@ts-ignore
        const handleMouseOut = (event, d) => {
            d3.select(event.currentTarget).transition().delay(300).duration(500).attr('fill', 'orange');
        }

        // TODO: mean, low and high can be empty!!!
        useEffect(() => {
            if (graphDataLength > 0) {
                // Scale X
                const xScale = d3.scaleTime()
                    .domain([new Date(graphDataDay[0]), new Date(graphDataDay[graphDataDay.length - 1])])
                    .range([0, graphWidth]);

                // LOW
                const yScaleLow = d3.max(graphDataLow);
                const yScaleMean = d3.max(graphDataMean);
                const yScaleHigh = d3.max(graphDataHigh);
                const yScale = d3.scaleLinear()
                    .domain([yScaleLow - 100, yScaleHigh + 100])
                    .range([graphHeight, 0]);



                // MAIN
                const d3Main = d3.select(d3Graph.current)
                    .attr('width', width)
                    .attr('height', height);

                // MAIN Container
                const svgGraph = d3Main
                    .append('g')
                    .attr('width', graphWidth)
                    .attr('height', graphHeight)
                    .attr('transform', `translate(${graphMargins.left}, ${graphMargins.top})`);

                // Bind the data
                console.log(svgGraph)
                // svgGraph.data(graphData)
                //     .enter()
                //     .append('g')
                //     .append('path')
                //     .attr('stroke', 'steelblue')
                //     .attr('stroke-width', 2)
                //     .attr('fill', 'none')

                // Axis X and Y
                const xAxisGroup = d3Main
                    .append('g')
                    .attr('class', 'x-axis')
                    .attr('transform', `translate(${graphMargins.left}, ${graphHeight + graphMargins.top})`)

                const xAxis = d3.axisBottom(xScale);

                const yAxisGroup = d3Main.append('g')
                    .attr('class', 'y-axis')
                    .attr('transform', `translate(${graphMargins.left}, ${graphMargins.top})`);

                const yAxis = d3.axisLeft(yScale)
                    .ticks(6)
                    .tickFormat(d => `${d} €`);

                xAxisGroup.call(xAxis);
                yAxisGroup.call(yAxis);


                // Dots
                const dots = svgGraph.selectAll('circle')
                    .data(graphData)

                dots.enter()
                    .append('circle')
                    .attr('r', 3)
                    .attr('cx', (d, i, n) => xScale(new Date(graphDataDay[i])))
                    .attr('cy', (d, i, n) => yScale(graphDataLow[i]))
                    .attr('fill', '#028090')

                dots.enter()
                    .append('circle')
                    .attr('r', 3)
                    .attr('cx', (d, i, n) => xScale(new Date(graphDataDay[i])))
                    .attr('cy', (d, i, n) => yScale(graphDataMean[i]))
                    .attr('fill', '#DEB841')

                dots.enter()
                    .append('circle')
                    .attr('r', 3)
                    .attr('cx', (d, i, n) => xScale(new Date(graphDataDay[i])))
                    .attr('cy', (d, i, n) => yScale(graphDataHigh[i]))
                    .attr('fill', '#F45B69')

                // Line
                const setLine = d3.line()
                    .x((d, i) => xScale(new Date(graphDataDay[i])))
                    .y((d, i) => yScale(graphDataLow[i]));

                const setLine2 = d3.line()
                    .x((d, i) => xScale(new Date(graphDataDay[i])))
                    .y((d, i) => yScale(graphDataMean[i]));

                const setLine3 = d3.line()
                    .x((d, i) => xScale(new Date(graphDataDay[i])))
                    .y((d, i) => yScale(graphDataHigh[i]));

                svgGraph.append('path')
                    .data([graphData])
                    .attr('fill', 'none')
                    .attr('stroke', '#028090')
                    .attr('stroke-width', 1)
                    //@ts-ignore
                    .attr('d', setLine)

                svgGraph.append('path')
                    .data([graphData])
                    .attr('fill', 'none')
                    .attr('stroke', '#DEB841')
                    .attr('stroke-width', 1)
                    //@ts-ignore
                    .attr('d', setLine2)

                svgGraph.append('path')
                    .data([graphData])
                    .attr('fill', 'none')
                    .attr('stroke', '#F45B69')
                    .attr('stroke-width', 1)
                    //@ts-ignore
                    .attr('d', setLine3)



                // Adjust X Axis
                xAxisGroup.selectAll('text')
                    .attr('transform', 'rotate(-30)')
                    .attr('text-anchor', 'end')

                // d3Main.selectAll('rect')
                //     .on('mouseover', handleMouseOver)
                //     .on('mouseout', handleMouseOut);
            }
        }, [graphData]);

        if (graphData.length === 0) {
            return null;
        }

        return (
            <svg className={className} ref={d3Graph}/>
        );

    };

    // HEADER
    const _renderHeader = () => {
        return (
            <div className="ssg-header">
                <h1 className="ssg-header__title">{Text.PAGE_TITLE}<small>{Text.PAGE_SUBTITLE}</small>
                    <InsertChartOutlined className="ssg-header__title-icon"/>
                </h1>
            </div>
        )
    };

    // ROUTE SELECTOR
    const _renderRouteSelector = () => {
        return (
            <>
                <h2 className="ssg-main__title">{Text.SECTION_ROUTE_SELECTOR}</h2>
                <Grid container spacing={2} className="ssg-main__route-selector">
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
                            className="ssg-main__route-selector-button--adjust"
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
                            onClick={() => clearSeach()}
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
                <span className="ssg-main__route-selector-info-flag">{countryFlagComponent(seaportRouteSelected)}</span>
                <div className="ssg-main__route-selector-info-text">
                    <span className="ssg-main__route-selector-info-name">
                        {seaportRouteSelected?.name ? seaportRouteSelected?.name : seaportRoute}
                    </span>
                    <span className="ssg-main__route-selector-info-text-code">
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
            <div className="ssg-main__alert">
                <Collapse in={isApiError}>
                    <Alert
                        className="ssg-main__alert-error"
                        severity="error"
                        action={
                            <IconButton
                                aria-label="close"
                                color="inherit"
                                size="small"
                                onClick={() => {
                                    setIsApiError(false);
                                }}
                            >
                                <Close fontSize="inherit" />
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
            <Paper className="ssg-main__graph">
                <D3Graph width={852} height={320} className="ssg-main__graph-d3js"/>
                {_renderGraphDataStatusMessage()}
            </Paper>
        )
    };

    // GRAPH STATUS MESSAGES
    const _renderGraphDataStatusMessage = () => {
        let statusTextPrimary = GraphStatus.INITIAL;
        let statusTextSecondary = GraphStatus.SELECT_ROUTE;

        // if (isGetGraphDataStarted) {
        //     statusTextPrimary = GraphStatus.FETCH_STARTED;
        //     statusTextSecondary = GraphStatus.EMPTY;
        // }
        //
        // if (isGetGraphDataStarted && isGetGraphDataEnded && graphDataLength === 0) {
        //     statusTextPrimary = GraphStatus.FETCH_NO_RECORDS;
        //     statusTextSecondary = GraphStatus.SELECT_ROUTE_OTHER;
        // }
        //
        // if (isGetGraphDataStarted && isGetGraphDataEnded && isApiError) {
        //     statusTextPrimary = GraphStatus.FETCH_FAILED;
        //     statusTextSecondary = GraphStatus.SELECT_ROUTE_OTHER;
        // }

        // if () {
        //     statusTextPrimary = GraphStatus.CLEARED;
        // }

        if (isApiError) {
            statusTextPrimary = GraphStatus.FETCH_FAILED;
            statusTextSecondary = GraphStatus.SELECT_ROUTE_OTHER;
        }

        if (graphDataLength > 0) {
            return null;
        }

        return (
            <div className="ssg-main__graph-status-message">
                <h1 className="ssg-main__graph-status-message-title">{statusTextPrimary}<small className="ssg-main__graph-status-message-subtitle">{statusTextSecondary}</small></h1>
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
            <Collapse in={graphDataLength > 0} className="ssg-options">
                <Grid container spacing={5}>
                    <Grid item xs={9}>
                        <MuiPickersUtilsProvider utils={DateFnsUtils}>
                            <Grid container className="ssg-options__time-range">
                                {Text.DATE_RANGE_FROM}
                                <KeyboardDatePicker
                                    {...commonProps}
                                    variant="inline"
                                    margin="normal"
                                    value={selectedDateFrom}
                                    onChange={handleDateChangeFrom}
                                    KeyboardButtonProps={{
                                        'aria-label': Text.SET_DATE_FROM,
                                    }}
                                />
                                {Text.DATE_RANGE_TO}
                                <KeyboardDatePicker
                                    {...commonProps}
                                    variant="inline"
                                    margin="normal"
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
                            color='primary'
                            disabled={isSearchDisabled}
                            disableElevation
                            onClick={() => saveGraphToPng()}
                            variant='contained'
                            aria-label={Text.SECTION_ROUTE_SAVE_AS_PNG}
                        >
                            <GetApp className="ssg-options__button--icon"/>
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
            <footer className="ssg-footer">
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

    // const _renderLoading = () => {
    //     return (
    //         <div className="ssg-loading"><CircularProgress /> Loading...</div>
    //     )
    // };

    // ROUTE SELECT DIALOG
    const _renderRouteSelectDialog = () => {
        if (!isDialogOpen || seaportList.length === 0) {
            return null;
        }

        return (
            <Dialog aria-labelledby="Select seaport" className="ssg-dialog" open={isDialogOpen} onClose={handleDialogClose}>
                <DialogTitle className="ssg-dialog__title" id="Select seaport origin">Select <strong>from</strong> seaport
                    <Button
                        aria-label="close"
                        className="ssg-dialog__title-close"
                        variant="contained"
                        color="default"
                        disableElevation
                        onClick={() => {
                            setIsDialogOpen(false);
                        }}
                    >
                        <Close fontSize="inherit" />
                    </Button>
                </DialogTitle>
                <List className="ssg-dialog__list">
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
                                    <Avatar variant="rounded" style={{width: 36, height: 24}}>
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
            <div>
                {Text.LOADING}
                <CircularProgress/>
            </div>
        )
    }

    return (
        <div className={`ssg-wrapper bg-ver-3 ${randomNumber(4)}`}>
            <div className="ssg">
                <Container maxWidth="md" >
                    {_renderHeader()}
                    <Paper className="ssg-main">
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
