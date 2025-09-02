const {CloudRunClient} = require('@google-cloud/run');

const client = new CloudRunClient();
const projectId = 'doc-qa-genai-469807';
const region = 'us-central1';
const serviceName = 'doc-qa-backend';

/**
 * Cloud Function to manage Cloud Run service state
 * Responds to HTTP requests with action=start or action=stop
 */
exports.manageService = async (req, res) => {
  const action = req.body.action || req.query.action;
  
  if (!action || !['start', 'stop'].includes(action)) {
    return res.status(400).json({
      error: 'Invalid action. Use action=start or action=stop'
    });
  }

  const name = `projects/${projectId}/locations/${region}/services/${serviceName}`;
  
  try {
    if (action === 'stop') {
      // Scale to zero instances
      await client.replaceService({
        service: {
          name: name,
          spec: {
            template: {
              metadata: {
                annotations: {
                  'autoscaling.knative.dev/minScale': '0',
                  'autoscaling.knative.dev/maxScale': '0'
                }
              }
            },
            traffic: [{
              percent: 0,
              latestRevision: true
            }]
          }
        }
      });
      
      console.log(`Service ${serviceName} stopped at ${new Date().toISOString()}`);
      res.json({
        status: 'success',
        action: 'stop',
        message: 'Service scaled to zero instances',
        timestamp: new Date().toISOString()
      });
      
    } else if (action === 'start') {
      // Scale back to normal operation
      await client.replaceService({
        service: {
          name: name,
          spec: {
            template: {
              metadata: {
                annotations: {
                  'autoscaling.knative.dev/minScale': '0',
                  'autoscaling.knative.dev/maxScale': '3'
                }
              }
            },
            traffic: [{
              percent: 100,
              latestRevision: true
            }]
          }
        }
      });
      
      console.log(`Service ${serviceName} started at ${new Date().toISOString()}`);
      res.json({
        status: 'success',
        action: 'start',
        message: 'Service scaled back to normal operation',
        timestamp: new Date().toISOString()
      });
    }
    
  } catch (error) {
    console.error(`Error ${action}ing service:`, error);
    res.status(500).json({
      status: 'error',
      action: action,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
};
