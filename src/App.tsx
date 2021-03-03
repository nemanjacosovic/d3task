import React, {useEffect, useRef, useState} from 'react';
import axios from 'axios';
import * as d3 from 'd3';
import * as CountryFlag from 'country-flag-icons/react/3x2';

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
    Paper,
} from '@material-ui/core';
import {saveSvgAsPng} from 'save-svg-as-png';
import Alert from '@material-ui/lab/Alert';
import {Clear, Close, DirectionsBoat, DirectionsBoatOutlined, InsertChartOutlined, GetApp} from '@material-ui/icons';
import {GraphStatus, Seaport} from "./constants/CommonConstants";
import API_CONFIG from './config';
import {mockDataRouteSghRtm} from './mocks/mockDataRouteSghRtm';

import './App.css';

interface ISeaport {
    code: string;
    name: string;
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
}

interface SimpleDialogProps {
    open: boolean;
    selectedValue?: string;
    onClose: (value: string) => void;
}

function App() {
    const [isLoading, setIsLoading] = useState(true);
    const [isApiError, setIsApiError] = useState(false);
    const [apiErrorMessage, setApiErrorMessage] = useState('');
    const [seaportList, setSeaportList] = useState([]);
    const [isGetGraphDataStarted, setIsGetGraphDataStarted] = useState(false);
    const [isGetGraphDataEnded, setIsGetGraphDataEnded] = useState(true);
    const [graphData, setGraphData] = useState([]);
    const [graphDataLength, setGraphDataLength] = useState(0);
    const [graphDataRangeStart, setGraphDataRangeStart] = useState<string>('');
    const [graphDataRangeEnd, setGraphDataRangeEnd] = useState<string>('');
    const [seaportSelectedFrom, setSeaportSelectedFrom] = useState<ISeaport | null>(null);
    const [seaportSelectedTo, setSeaportSelectedTo] = useState<ISeaport | null>(null);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [dialogOpenType, setDialogOpenType] = useState('');
    const [isSearchDisabled, setIsSearchDisabled] = useState(true);

    const d3Graph = useRef(null);


    const axiosToAWS = axios.create({
        baseURL: API_CONFIG.BASE_URL,
        headers: {
            'x-api-key': API_CONFIG.API_KEY
        }
    });


    useEffect(() => {
        if (seaportList.length === 0) {
            getSeaportList();
            setIsLoading(false);
        }

        setGraphDataLength(graphData.length);
    }, []);

    useEffect(() => {
        if (graphDataLength > 0) {
            // @ts-ignore
            setGraphDataRangeStart(graphData[0]?.day);
            // @ts-ignore
            setGraphDataRangeEnd(graphData[graphDataLength - 1]?.day);
        }
    }, [graphData])

    useEffect(() => {
        if (!!seaportSelectedFrom?.code && !!seaportSelectedTo?.code) {
            setIsSearchDisabled(false);
        }
    }, [seaportSelectedFrom, seaportSelectedTo]);

    useEffect(() => {
        if (isApiError) {
            clearSeach();
        }
    }, [isApiError]);

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
        setGraphData([]);
        setGraphDataRangeStart('');
        setGraphDataRangeEnd('');
        setSeaportSelectedFrom(null);
        setSeaportSelectedTo(null);
        setIsSearchDisabled(true);
    }

    // GET Graph Data
    const getGraphData = () => {
        if (isSearchDisabled) {
            return null;
        }

        setIsGetGraphDataStarted(true);

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
                setIsApiError(true);
                setApiErrorMessage(error.message);
            })
            .then(() => {
                setIsGetGraphDataEnded(true);
            });
    };

    // Dialog OPEN
    const handleDialogOpen = (portRoute: string) => {
        setIsApiError(false);
        setIsDialogOpen(true);
        setDialogOpenType(portRoute);
    };

    // Dialog CLOSED
    const handleDialogClose = () => {
        setIsDialogOpen(false);
    };

    // Dialog SELECTED
    const handleDialogSelectedValue = (seaportSelected: ISeaport) => {
        dialogOpenType === Seaport.FROM ? setSeaportSelectedFrom(seaportSelected) : setSeaportSelectedTo(seaportSelected);
        handleDialogClose();
    };

    // Graph messages
    const showGraphDataStatus = () => {
        let statusTextPrimary = GraphStatus.INITIAL;
        let statusTextSecondary = GraphStatus.SELECT_ROUTE;

        if (isGetGraphDataStarted) {
            statusTextPrimary = GraphStatus.FETCH_STARTED;
            statusTextSecondary = GraphStatus.EMPTY;
        }

        if (isGetGraphDataStarted && isGetGraphDataEnded && graphDataLength === 0) {
            statusTextPrimary = GraphStatus.FETCH_NO_RECORDS;
            statusTextSecondary = GraphStatus.SELECT_ROUTE_OTHER;
        }

        if (isGetGraphDataStarted && isGetGraphDataEnded && isApiError) {
            statusTextPrimary = GraphStatus.FETCH_FAILED;
            statusTextSecondary = GraphStatus.SELECT_ROUTE_OTHER;
        }

        // if () {
        //     statusTextPrimary = GraphStatus.CLEARED;
        // }

        return (
            <div className="ssg-graph-status">
                <h1>{statusTextPrimary}<small>{statusTextSecondary}</small></h1>
            </div>
        )
    }

    // D3 Graph
    const D3Graph = (props: ID3Graph) => {
        const { height, width } = props;
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
                const xScaleDay = mockDataRouteSghRtm.map(entry => entry.day);
                const xScale = d3.scaleBand()
                    .domain(xScaleDay)
                    .range([0, graphWidth])
                    .paddingInner(0.2)
                    .paddingOuter(0.2);

                // Scale Y
                const yScaleLow = d3.max(mockDataRouteSghRtm.map(entry => entry.high));
                const yScale = d3.scaleLinear()
                    .domain([0, yScaleLow ?? graphHeight])
                    .range([graphHeight, 0]);

                // MAIN
                const d3Main = d3.select(d3Graph.current);

                // MAIN Container
                const svgGraph = d3Main
                    .attr('width', width)
                    .attr('height', height)
                    .append('g')
                    .attr('width', graphWidth)
                    .attr('height', graphHeight)
                    .attr('transform', `translate(${graphMargins.left}, ${graphMargins.top})`)
                    .selectAll('rect');

                // Bind the data
                svgGraph.data(mockDataRouteSghRtm)
                    .enter()
                    .append('rect')
                    .attr('x', d => xScale(d.day) ?? null)
                    .attr('y', d => graphHeight - (graphHeight - yScale(d.high)))
                    .attr('width', xScale.bandwidth)
                    .attr('height', d => graphHeight - yScale(d.high))
                    .attr('fill', 'orange');

                // Axis X and Y
                const xAxisGroup = d3Main
                    .append('g')
                    .attr('transform', `translate(${graphMargins.left}, ${graphHeight + graphMargins.top})`);
                const yAxisGroup = d3Main.append('g')
                    .attr('transform', `translate(${graphMargins.left}, ${graphMargins.top})`);

                const xAxis = d3.axisBottom(xScale)
                    .tickFormat(d => d.substring(0, d.length));
                const yAxis = d3.axisLeft(yScale)
                    .ticks(4);

                xAxisGroup.call(xAxis);
                yAxisGroup.call(yAxis);

                xAxisGroup.selectAll('text')
                    .attr('transform', 'rotate(-45)')
                    .attr('text-anchor', 'end')

                d3Main.selectAll('rect')
                    .on('mouseover', handleMouseOver)
                    .on('mouseout', handleMouseOut);
            }
        }, [graphData]);

        if (graphData.length === 0) {
            return null;
        }

        return (
            <svg className="d3-graph-component" ref={d3Graph}/>
        );

    };

    const saveGraphToPng = () => {
        return saveSvgAsPng(document.querySelector('.d3-graph-component'), 'export-ssg.png');
    }

    const countryFlagComponent = (seaport: ISeaport | null) => {
        if (!seaport) {
            return null;
        }

        const CountryFlagComponent = seaport?.code.substring(0, 2).split('.').reduce((o, i) => o[i], CountryFlag);
        return <CountryFlagComponent key={seaport.name}/>
    }

    // Simple Dialog Component
    const SimpleDialog = (props: SimpleDialogProps) => {
        const {open} = props;

        if (!open || seaportList.length === 0) {
            return null;
        }

        return (
            <Dialog aria-labelledby="Select seaport" open={isDialogOpen}>
                <DialogTitle id="Select seaport origin">Select <strong>from</strong> seaport</DialogTitle>
                <List>
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
    }

    if (isLoading) {
        return (
            <div><CircularProgress /> Loading...</div>
        )
    }

    return (
        <Container maxWidth="md">
            <h1 className="ssg-title">
                SSG
                <small>Seaport Shipping Graphs</small>
                <InsertChartOutlined className="ssg-title__icon"/>
            </h1>
            <Paper className='ssg'>
                <main className='ssg-main'>
                    <div>
                        <h2 style={{fontSize: 14}}>Route selection</h2>
                        <Grid container spacing={2} style={{marginBottom: 5}}>
                            <Grid item xs={3}>
                                <Button
                                    style={{width: '100%', height: 48}}
                                    variant='outlined'
                                    color='primary'
                                    className='ssg-route-select__button'
                                    onClick={() => handleDialogOpen(Seaport.FROM)}
                                >
                                    <DirectionsBoat className="ssg-route-select__button-icon"/>
                                    <span className="ssg-route-select__info-flag">
                                        {countryFlagComponent(seaportSelectedFrom)}
                                    </span>
                                    <div className="ssg-route-select__info">
                                        <span className="ssg-route-select__info-name">
                                            {seaportSelectedFrom?.name ? seaportSelectedFrom?.name : Seaport.FROM}
                                        </span>
                                        <span className="ssg-route-select__info-code">
                                            {seaportSelectedFrom?.code ?? seaportSelectedFrom?.code}
                                        </span>
                                    </div>
                                </Button>
                            </Grid>
                            <Grid item xs={3}>
                                <Button
                                    style={{width: '100%', height: 48}}
                                    variant='outlined'
                                    color='primary'
                                    className='ssg-route-select__button'
                                    onClick={() => handleDialogOpen(Seaport.TO)}
                                >
                                    <DirectionsBoatOutlined style={{fontSize: '20px', position: 'absolute', left: 10}}/>
                                    <span className="ssg-route-select__info-flag">
                                        {countryFlagComponent(seaportSelectedTo)}
                                    </span>
                                    <div className="ssg-route-select__info">
                                        <span className="ssg-route-select__info-name">
                                            {seaportSelectedTo?.name ? seaportSelectedTo?.name : Seaport.TO}
                                        </span>
                                        <span className="ssg-route-select__info-code">
                                            {seaportSelectedTo?.code ?? seaportSelectedTo?.code}
                                        </span>
                                    </div>
                                </Button>
                            </Grid>
                            <Grid item>
                                <Button
                                    style={{width: '100%', height: 48}}
                                    variant='contained'
                                    color='primary'
                                    onClick={() => getGraphData()}
                                    disableElevation
                                    disabled={isSearchDisabled}
                                >
                                    Get prices
                                </Button>
                            </Grid>
                            <Grid item>
                                <Button
                                    style={{width: 42, minWidth: 42, height: 48}}
                                    variant='outlined'
                                    onClick={() => clearSeach()}
                                    disableElevation
                                    disabled={isSearchDisabled}
                                >
                                    <Clear/>
                                </Button>
                            </Grid>
                            <Grid item>
                                <Collapse in={isApiError}>
                                    <Alert
                                        className="ssg-alert-error"
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
                            </Grid>
                        </Grid>
                        <Paper className="ssg-graph">
                            <D3Graph width={852} height={320}/>
                            {showGraphDataStatus()}
                        </Paper>
                        <Collapse in={graphDataLength > 0}>
                            <Grid container spacing={5}>
                                <Grid item xs={8}>
                                    <h4 style={{padding: 0, margin: 0, lineHeight: '36px'}}>Shipping prices for {graphDataRangeStart} to {graphDataRangeEnd}.</h4>
                                </Grid>
                                <Grid item xs={4} style={{textAlign: 'right'}}>
                                    <Button
                                        // style={{width: 42, minWidth: 42, height: 48}}
                                        variant='outlined'
                                        onClick={() => saveGraphToPng()}
                                        disableElevation
                                        disabled={isSearchDisabled}
                                    >
                                        <GetApp/>
                                        Save as PNG
                                    </Button>
                                </Grid>
                            </Grid>
                        </Collapse>
                    </div>
                </main>
            </Paper>
            <SimpleDialog open={isDialogOpen} onClose={handleDialogClose}/>
        </Container>
    );
}

export default App;
