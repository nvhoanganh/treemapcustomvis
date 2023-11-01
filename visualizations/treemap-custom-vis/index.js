import React from 'react';
import PropTypes from 'prop-types';
import {
    Radar,
    RadarChart,
    PolarGrid,
    PolarAngleAxis,
    PolarRadiusAxis,
    Treemap,
    Tooltip
} from 'recharts';
import { Card, CardBody, HeadingText, NrqlQuery, Spinner, AutoSizer } from 'nr1';

const TESTDATA = [
    {
        name: "melyprodcluster25",
        children: [
            { name: "Nutanix-Storage-MELYProdCluster24 (50.4TB)", size: 50.4 },
            { name: "NutanixManagementShare (44.7TB)", size: 44.7 },
            { name: "Nutanix_MELYVPINTXFS1_ctr (44.7TB)", size: 44.7 },
            { name: "SelfServiceContainer (44.7TB)", size: 44.7 },
            { name: "default-container-41968751240954 (44.7TB)", size: 44.7 }
        ]
    },
    {
        name: "melyprodcluster28",
        children: [
            { name: "Nutanix-Storage-A (20.4TB)", size: 20.4 },
            { name: "Nutanix-Storage-B (30.7TB)", size: 30.7 },
            { name: "Nutanix-Storage-C (44.7TB)", size: 44.7 },
            { name: "Nutanix-Storage-D (50.7TB)", size: 50.7 },
            { name: "Nutanix-Storage-E (10.7TB)", size: 10.7 }
        ]
    }
];

const COLORS = [
    "#8889DD",
    "#9597E4",
    "#8DC77B",
    "#A5D297",
    "#E2CF45",
    "#F8C12D"
];

const CustomizedContent = (props) => {
    const {
        root,
        depth,
        x,
        y,
        width,
        height,
        index,
        colors,
        name,
        value
    } = props;

    return (
        <g>
            <rect
                x={x}
                y={y}
                width={width}
                height={height}
                style={{
                    fill:
                        depth < 2
                            ? colors[Math.floor((index / root.children.length) * 6)]
                            : "none",
                    stroke: "#fff",
                    strokeWidth: 2 / (depth + 1e-10),
                    strokeOpacity: 1 / (depth + 1e-10)
                }}
            />
            {depth > 1 && depth <= 3 ? (
                <text
                    x={x + width / 2}
                    y={y + height / 2 + 7}
                    textAnchor="middle"
                    fontSize={13}
                    fill="white"
                    strokeOpacity={0}
                >
                    {name}
                </text>
            ) : null}
            {depth === 1 ? (
                <text x={x + 10} y={y + 40} fill="#fff" fontSize={30} fillOpacity={100}>
                    Cluster: {name}
                </text>
            ) : null}
        </g>
    );
};

export default class TreemapCustomVisVisualization extends React.Component {
    // Custom props you wish to be configurable in the UI must also be defined in
    // the nr1.json file for the visualization. See docs for more details.
    static propTypes = {
        /**
         * A fill color to override the default fill color. This is an example of
         * a custom chart configuration.
         */
        fill: PropTypes.string,

        /**
         * A stroke color to override the default stroke color. This is an example of
         * a custom chart configuration.
         */
        stroke: PropTypes.string,
        /**
         * An array of objects consisting of a nrql `query` and `accountId`.
         * This should be a standard prop for any NRQL based visualizations.
         */
        nrqlQueries: PropTypes.arrayOf(
            PropTypes.shape({
                accountId: PropTypes.number,
                query: PropTypes.string,
            })
        ),
    };

    /**
     * Restructure the data for a non-time-series, facet-based NRQL query into a
     * form accepted by the Recharts library's RadarChart.
     * (https://recharts.org/api/RadarChart).
     */
    transformData = (rawData) => {
        const roundToTB = n => (n / 1_000_000_000_000).toFixed(2);
        return rawData.map(x => ({
            name: x.metadata.name,
            size: x.data[0].y
        })).reduce((pre, cur) => {
            // facet involved
            var levels = cur.name.split(', ');
            if (levels.length > 1) {
                // facet involved
                return [
                    ...pre,
                    {
                        name: levels[0],
                        children: [
                            {
                                name: `${roundToTB(cur.size) > 45 ? '🆘':'✅'} ${levels[1]} - ${roundToTB(cur.size)}TB`,
                                size: cur.size
                            }
                        ]
                    }
                ]
            } else {
                return [
                    ...pre,
                    cur
                ]
            }
        }, [])
            .reduce((pre, cur) => {
                const toplevels = pre.filter(x => x.name === cur.name);
                if (toplevels?.length > 0) {
                    const toplevel = toplevels[0];
                    toplevel.children.push(...cur.children);
                    return pre;
                } else {
                    return [
                        ...pre,
                        cur
                    ]
                }
            }, [])
            ;
    }

    /**
     * Format the given axis tick's numeric value into a string for display.
     */
    formatTick = (value) => {
        return value.toLocaleString();
    };

    render() {
        const { nrqlQueries, stroke, fill } = this.props;

        const nrqlQueryPropsAvailable =
            nrqlQueries &&
            nrqlQueries[0] &&
            nrqlQueries[0].accountId &&
            nrqlQueries[0].query;

        if (!nrqlQueryPropsAvailable) {
            return <EmptyState />;
        }

        return (
            <AutoSizer>
                {({ width, height }) => (
                    <NrqlQuery
                        query={nrqlQueries[0].query}
                        accountId={parseInt(nrqlQueries[0].accountId)}
                        pollInterval={NrqlQuery.AUTO_POLL_INTERVAL}
                    >
                        {({ data, loading, error }) => {
                            if (loading) {
                                return <Spinner />;
                            }

                            if (error) {
                                return <ErrorState />;
                            }

                            const transformedData = this.transformData(data);

                            return (
                                <Treemap
                                    width={width}
                                    height={height}
                                    data={transformedData}
                                    dataKey="size"
                                    stroke="#fff"
                                    fill="#8884d8"
                                    content={<CustomizedContent colors={COLORS} />}
                                >
                                    <Tooltip />
                                </Treemap>
                            );
                        }}
                    </NrqlQuery>
                )}
            </AutoSizer>
        );
    }
}

const EmptyState = () => (
    <Card className="EmptyState">
        <CardBody className="EmptyState-cardBody">
            <HeadingText
                spacingType={[HeadingText.SPACING_TYPE.LARGE]}
                type={HeadingText.TYPE.HEADING_3}
            >
                Please provide at least one NRQL query & account ID pair
            </HeadingText>
            <HeadingText
                spacingType={[HeadingText.SPACING_TYPE.MEDIUM]}
                type={HeadingText.TYPE.HEADING_4}
            >
                An example NRQL query you can try is:
            </HeadingText>
            <code>
                FROM NrUsage SELECT sum(usage) FACET metric SINCE 1 week ago
            </code>
        </CardBody>
    </Card>
);

const ErrorState = () => (
    <Card className="ErrorState">
        <CardBody className="ErrorState-cardBody">
            <HeadingText
                className="ErrorState-headingText"
                spacingType={[HeadingText.SPACING_TYPE.LARGE]}
                type={HeadingText.TYPE.HEADING_3}
            >
                Oops! Something went wrong.
            </HeadingText>
        </CardBody>
    </Card>
);
