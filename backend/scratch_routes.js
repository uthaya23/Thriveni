const fs = require('fs');
const path = require('path');

const routes = [
  {
    file: 'aiRoutes.js',
    replaces: [
      {
        find: "router.post('/analyze-photos/:jobId', async (req, res) => {",
        replace: "router.post('/analyze-photos/:jobId', resolveJobId('jobId'), async (req, res) => {"
      }
    ]
  },
  {
    file: 'auditRoutes.js',
    replaces: [
      {
        find: "router.get('/job/:jobId', asyncHandler(async (req, res) => {",
        replace: "router.get('/job/:jobId', resolveJobId('jobId'), asyncHandler(async (req, res) => {"
      }
    ]
  },
  {
    file: 'inspectionRoutes.js',
    replaces: [
      {
        find: "router.route('/:jobId')",
        replace: "router.use('/:jobId', resolveJobId('jobId'));\nrouter.route('/:jobId')"
      },
      {
        find: "router.post('/:jobId/ai-analyze', asyncHandler(async (req, res) => {",
        replace: "router.post('/:jobId/ai-analyze', resolveJobId('jobId'), asyncHandler(async (req, res) => {"
      }
    ]
  },
  {
    file: 'inventoryRoutes.js',
    replaces: [
      {
        find: "router.get('/report/job/:jobId', inventoryController.getJobConsumption);",
        replace: "router.get('/report/job/:jobId', resolveJobId('jobId'), inventoryController.getJobConsumption);"
      }
    ]
  },
  {
    file: 'materialsRoutes.js',
    replaces: [
      {
        find: "router.get('/:jobId', asyncHandler(async (req, res) => {",
        replace: "router.get('/:jobId', resolveJobId('jobId'), asyncHandler(async (req, res) => {"
      },
      {
        find: "router.post('/:jobId', asyncHandler(async (req, res) => {",
        replace: "router.post('/:jobId', resolveJobId('jobId'), asyncHandler(async (req, res) => {"
      },
      {
        find: "router.patch('/:jobId/item/:itemId', asyncHandler(async (req, res) => {",
        replace: "router.patch('/:jobId/item/:itemId', resolveJobId('jobId'), asyncHandler(async (req, res) => {"
      }
    ]
  }
];

routes.forEach(route => {
  const fullPath = path.join(__dirname, 'routes', route.file);
  if (fs.existsSync(fullPath)) {
    let content = fs.readFileSync(fullPath, 'utf8');
    
    // add import if not exists
    if (!content.includes('resolveJobId')) {
      content = content.replace(
        "const router = express.Router();",
        "const router = express.Router();\nconst resolveJobId = require('../middleware/resolveJobId');"
      );
    }

    route.replaces.forEach(rep => {
      content = content.replace(rep.find, rep.replace);
    });

    fs.writeFileSync(fullPath, content);
    console.log(`Updated ${route.file}`);
  }
});
