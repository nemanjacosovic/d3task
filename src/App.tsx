import React, {useEffect, useState, useRef} from 'react';
import axios from 'axios';
import * as d3 from 'd3';
import * as CountryFlag from 'country-flag-icons/react/3x2';

import {
    Button,
    CircularProgress,
    IconButton,
    Container,
    Grid,
    Collapse,
    Avatar,
    Paper,
    List,
    ListItem,
    ListItemAvatar,
    ListItemText,
    DialogTitle,
    Dialog,
} from '@material-ui/core';
import Alert from '@material-ui/lab/Alert';
import {DirectionsBoat, DirectionsBoatOutlined, InsertChartOutlined, Close, Clear} from '@material-ui/icons';
import {Seaport} from "./constants/CommonConstants";
import API_CONFIG from './config';
import { mockDataRouteSghRtm } from './mocks/mockDataRouteSghRtm';

import './App.css';

interface ISeaport {
    code: string;
    name: string;
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
    const [graphData, setGraphData] = useState([])
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
    }, []);

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

    useEffect(() => {
        console.log(graphData);
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
        setGraphData([]);
        setSeaportSelectedFrom(null)
        setSeaportSelectedTo(null)
        setIsSearchDisabled(true);
    }

    // GET Graph Data
    const getGraphData = () => {
        if (isSearchDisabled) {
            return null;
        }

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
                console.log(graphData);
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
        // if (graphData) {
        //     return null;
        // }
        return (
            <div className="ssg-graph-status">
                <h1>Oh, no! There is no data.<small>Try selecting a route</small></h1>
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

        useEffect(() => {
            if (graphData.length > 0) {
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
                        <h4>Shipping prices for DATE1 to DATE2</h4>
                    </div>
                </main>
            </Paper>
            <SimpleDialog open={isDialogOpen} onClose={handleDialogClose}/>
        </Container>
    );
}

export default App;
