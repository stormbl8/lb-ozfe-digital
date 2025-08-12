import React, { useState, useEffect } from 'react';
import { Form, Button, Container, Row, Col, Card } from 'react-bootstrap';
import { toast } from 'react-toastify';
import api from '../api'; // Assuming an api.js for backend calls

const AIConfig = () => {
    const [settings, setSettings] = useState({
        alert_enabled: false,
        alert_channels: [],
        slack_webhook_url: '',
        email_recipients: '', // Stored as comma-separated string for input
        alert_threshold_zscore: 2.0,
        alert_cooldown_minutes: 5,
        action_enabled: false,
        action_rules: '[]', // Stored as JSON string for textarea input
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchSettings();
    }, []);

    const fetchSettings = async () => {
        try {
            setLoading(true);
            const response = await api.get('/ai_config');
            const data = response.data;
            setSettings({
                ...data,
                email_recipients: data.email_recipients ? data.email_recipients.join(', ') : '',
                action_rules: JSON.stringify(data.action_rules, null, 2), // Pretty print JSON
            });
            setLoading(false);
        } catch (error) {
            toast.error('Failed to fetch AI settings.');
            console.error('Error fetching AI settings:', error);
            setLoading(false);
        }
    };

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setSettings(prevSettings => ({
            ...prevSettings,
            [name]: type === 'checkbox' ? checked : value
        }));
    };

    const handleChannelChange = (e) => {
        const { value, checked } = e.target;
        setSettings(prevSettings => {
            const currentChannels = new Set(prevSettings.alert_channels);
            if (checked) {
                currentChannels.add(value);
            } else {
                currentChannels.delete(value);
            }
            return { ...prevSettings, alert_channels: Array.from(currentChannels) };
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const payload = {
                ...settings,
                email_recipients: settings.email_recipients.split(',').map(s => s.trim()).filter(s => s),
                action_rules: JSON.parse(settings.action_rules),
            };
            await api.put('/ai_config', payload);
            toast.success('AI settings updated successfully!');
            fetchSettings(); // Re-fetch to ensure consistency
        } catch (error) {
            toast.error('Failed to update AI settings.');
            console.error('Error updating AI settings:', error);
        }
    };

    if (loading) {
        return <Container className="mt-4">Loading settings...</Container>;
    }

    return (
        <Container className="mt-4">
            <Row className="justify-content-md-center">
                <Col md={8}>
                    <Card>
                        <Card.Header as="h5">AI Anomaly Detection Settings</Card.Header>
                        <Card.Body>
                            <Form onSubmit={handleSubmit}>
                                <Form.Group className="mb-3" controlId="formAlertEnabled">
                                    <Form.Check
                                        type="checkbox"
                                        label="Enable Alerting"
                                        name="alert_enabled"
                                        checked={settings.alert_enabled}
                                        onChange={handleChange}
                                    />
                                </Form.Group>

                                <Form.Group className="mb-3">
                                    <Form.Label>Alert Channels</Form.Label>
                                    <div>
                                        <Form.Check
                                            inline
                                            label="Slack"
                                            type="checkbox"
                                            name="alert_channels"
                                            value="slack"
                                            checked={settings.alert_channels.includes('slack')}
                                            onChange={handleChannelChange}
                                        />
                                        <Form.Check
                                            inline
                                            label="Email"
                                            type="checkbox"
                                            name="alert_channels"
                                            value="email"
                                            checked={settings.alert_channels.includes('email')}
                                            onChange={handleChannelChange}
                                        />
                                    </div>
                                </Form.Group>

                                <Form.Group className="mb-3" controlId="formSlackWebhookUrl">
                                    <Form.Label>Slack Webhook URL</Form.Label>
                                    <Form.Control
                                        type="text"
                                        name="slack_webhook_url"
                                        value={settings.slack_webhook_url}
                                        onChange={handleChange}
                                        placeholder="Enter Slack Webhook URL"
                                    />
                                </Form.Group>

                                <Form.Group className="mb-3" controlId="formEmailRecipients">
                                    <Form.Label>Email Recipients (comma-separated)</Form.Label>
                                    <Form.Control
                                        type="text"
                                        name="email_recipients"
                                        value={settings.email_recipients}
                                        onChange={handleChange}
                                        placeholder="email1@example.com, email2@example.com"
                                    />
                                </Form.Group>

                                <Form.Group className="mb-3" controlId="formAlertThresholdZscore">
                                    <Form.Label>Alert Threshold (Z-score)</Form.Label>
                                    <Form.Control
                                        type="number"
                                        step="0.1"
                                        name="alert_threshold_zscore"
                                        value={settings.alert_threshold_zscore}
                                        onChange={handleChange}
                                    />
                                </Form.Group>

                                <Form.Group className="mb-3" controlId="formAlertCooldownMinutes">
                                    <Form.Label>Alert Cooldown (Minutes)</Form.Label>
                                    <Form.Control
                                        type="number"
                                        step="1"
                                        name="alert_cooldown_minutes"
                                        value={settings.alert_cooldown_minutes}
                                        onChange={handleChange}
                                    />
                                </Form.Group>

                                <Form.Group className="mb-3" controlId="formActionEnabled">
                                    <Form.Check
                                        type="checkbox"
                                        label="Enable Automated Actions"
                                        name="action_enabled"
                                        checked={settings.action_enabled}
                                        onChange={handleChange}
                                    />
                                </Form.Group>

                                <Form.Group className="mb-3" controlId="formActionRules">
                                    <Form.Label>Action Rules (JSON Array)</Form.Label>
                                    <Form.Control
                                        as="textarea"
                                        rows={5}
                                        name="action_rules"
                                        value={settings.action_rules}
                                        onChange={handleChange}
                                    />
                                    <Form.Text className="text-muted">
                                        {`Enter action rules as a JSON array. Example: [{"anomaly_method": "isolation_forest", "metric": "sum(rate(nginx_http_requests_total[5m]))", "action": "restart_nginx"}]`}
                                    </Form.Text>
                                </Form.Group>

                                <Button variant="primary" type="submit">
                                    Save Settings
                                </Button>
                            </Form>
                        </Card.Body>
                    </Card>
                </Col>
            </Row>
        </Container>
    );
};

export default AIConfig;
