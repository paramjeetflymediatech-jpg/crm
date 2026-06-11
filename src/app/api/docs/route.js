import { NextResponse } from 'next/server';

const openApiSpec = {
  openapi: '3.0.3',
  info: {
    title: 'CRM SaaS REST API',
    description: 'Multi-Tenant CRM API — Authentication, Lead Management, Notifications, WordPress Integration, Facebook Lead Ads, Reports, and Admin',
    version: '1.0.0',
    contact: {
      name: 'CRM Support',
      email: 'support@crmsaas.com'
    }
  },
  servers: [
    { url: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000', description: 'Current Server' }
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'JWT Access Token obtained from /api/auth/login'
      },
      apiKey: {
        type: 'http',
        scheme: 'bearer',
        description: 'Company API Key used for WordPress/external integrations'
      }
    },
    schemas: {
      Lead: {
        type: 'object',
        properties: {
          id: { type: 'integer' },
          company_id: { type: 'integer' },
          assigned_to: { type: 'integer', nullable: true },
          source: { type: 'string', example: 'Contact Form 7' },
          first_name: { type: 'string', example: 'John' },
          last_name: { type: 'string', example: 'Doe' },
          email: { type: 'string', format: 'email' },
          phone: { type: 'string', example: '+1-555-0199' },
          subject: { type: 'string' },
          message: { type: 'string' },
          status: { type: 'string', enum: ['New', 'Contacted', 'Qualified', 'Follow Up', 'Proposal Sent', 'Converted', 'Lost'] },
          priority: { type: 'string', enum: ['Low', 'Medium', 'High'] },
          lead_score: { type: 'integer', minimum: 0, maximum: 100 },
          follow_up_date: { type: 'string', format: 'date-time', nullable: true },
          created_at: { type: 'string', format: 'date-time' },
          updated_at: { type: 'string', format: 'date-time' }
        }
      },
      User: {
        type: 'object',
        properties: {
          id: { type: 'integer' },
          company_id: { type: 'integer', nullable: true },
          name: { type: 'string' },
          email: { type: 'string', format: 'email' },
          role: { type: 'string', enum: ['super_admin', 'company_admin', 'staff'] },
          phone: { type: 'string', nullable: true },
          status: { type: 'string', enum: ['active', 'inactive'] },
          created_at: { type: 'string', format: 'date-time' }
        }
      },
      Notification: {
        type: 'object',
        properties: {
          id: { type: 'integer' },
          title: { type: 'string' },
          message: { type: 'string' },
          type: { type: 'string' },
          is_read: { type: 'boolean' },
          lead_id: { type: 'integer', nullable: true },
          created_at: { type: 'string', format: 'date-time' }
        }
      },
      Error: {
        type: 'object',
        properties: {
          error: { type: 'string' }
        }
      }
    }
  },
  security: [{ bearerAuth: [] }],
  tags: [
    { name: 'Auth', description: 'Authentication and session management' },
    { name: 'Leads', description: 'Lead CRUD and management' },
    { name: 'Notifications', description: 'In-app notification management' },
    { name: 'WordPress Integration', description: 'External API for WordPress lead collection' },
    { name: 'Facebook Lead Ads', description: 'Facebook Lead Ads webhook integration' },
    { name: 'Reports', description: 'Analytics and reporting' },
    { name: 'Settings', description: 'Company and user settings' },
    { name: 'Users', description: 'User management' },
    { name: 'Admin', description: 'Super admin platform management' }
  ],
  paths: {
    '/api/auth/login': {
      post: {
        tags: ['Auth'],
        summary: 'Login and obtain JWT access token',
        security: [],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['email', 'password'],
                properties: {
                  email: { type: 'string', format: 'email', example: 'admin@acme.com' },
                  password: { type: 'string', example: 'admin123' }
                }
              }
            }
          }
        },
        responses: {
          200: {
            description: 'Login successful',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    user: { $ref: '#/components/schemas/User' },
                    accessToken: { type: 'string' }
                  }
                }
              }
            }
          },
          401: { description: 'Invalid credentials', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } }
        }
      }
    },
    '/api/auth/logout': {
      post: {
        tags: ['Auth'],
        summary: 'Logout and invalidate session',
        responses: {
          200: { description: 'Logged out successfully' }
        }
      }
    },
    '/api/auth/me': {
      get: {
        tags: ['Auth'],
        summary: 'Get current authenticated user',
        responses: {
          200: { description: 'Current user data', content: { 'application/json': { schema: { type: 'object', properties: { user: { $ref: '#/components/schemas/User' } } } } } },
          401: { description: 'Unauthorized' }
        }
      }
    },
    '/api/auth/refresh': {
      post: {
        tags: ['Auth'],
        summary: 'Refresh access token using refresh token cookie',
        security: [],
        responses: {
          200: { description: 'New access token issued' },
          401: { description: 'Invalid or expired refresh token' }
        }
      }
    },
    '/api/auth/forgot-password': {
      post: {
        tags: ['Auth'],
        summary: 'Request password reset email',
        security: [],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['email'],
                properties: { email: { type: 'string', format: 'email' } }
              }
            }
          }
        },
        responses: {
          200: { description: 'Reset email sent (if account exists)' }
        }
      }
    },
    '/api/auth/reset-password': {
      post: {
        tags: ['Auth'],
        summary: 'Reset password using email token',
        security: [],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['token', 'password'],
                properties: {
                  token: { type: 'string', description: 'JWT token from reset email' },
                  password: { type: 'string', minLength: 6 }
                }
              }
            }
          }
        },
        responses: {
          200: { description: 'Password reset successful' },
          400: { description: 'Invalid or expired token' }
        }
      }
    },
    '/api/leads': {
      get: {
        tags: ['Leads'],
        summary: 'List leads with filters and pagination',
        parameters: [
          { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
          { name: 'limit', in: 'query', schema: { type: 'integer', default: 10 } },
          { name: 'search', in: 'query', schema: { type: 'string' } },
          { name: 'status', in: 'query', schema: { type: 'string' } },
          { name: 'source', in: 'query', schema: { type: 'string' } },
          { name: 'priority', in: 'query', schema: { type: 'string', enum: ['Low', 'Medium', 'High'] } },
          { name: 'assignedTo', in: 'query', schema: { type: 'integer' } }
        ],
        responses: {
          200: {
            description: 'Paginated lead list',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    leads: { type: 'array', items: { $ref: '#/components/schemas/Lead' } },
                    totalCount: { type: 'integer' },
                    totalPages: { type: 'integer' },
                    currentPage: { type: 'integer' }
                  }
                }
              }
            }
          }
        }
      },
      post: {
        tags: ['Leads'],
        summary: 'Create a new lead manually',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['first_name'],
                properties: {
                  first_name: { type: 'string', example: 'Jane' },
                  last_name: { type: 'string', example: 'Smith' },
                  email: { type: 'string', format: 'email' },
                  phone: { type: 'string' },
                  source: { type: 'string', default: 'Manual' },
                  status: { type: 'string', default: 'New' },
                  priority: { type: 'string', enum: ['Low', 'Medium', 'High'], default: 'Medium' },
                  subject: { type: 'string' },
                  message: { type: 'string' },
                  assigned_to: { type: 'integer', nullable: true }
                }
              }
            }
          }
        },
        responses: {
          201: { description: 'Lead created successfully' },
          400: { description: 'Validation error' }
        }
      }
    },
    '/api/leads/{id}': {
      get: {
        tags: ['Leads'],
        summary: 'Get a single lead with notes, activities, and tasks',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
        responses: {
          200: { description: 'Lead details with relations' },
          404: { description: 'Lead not found or unauthorized' }
        }
      },
      put: {
        tags: ['Leads'],
        summary: 'Update a lead',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
        requestBody: {
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/Lead' }
            }
          }
        },
        responses: {
          200: { description: 'Lead updated successfully' },
          400: { description: 'Validation error' },
          404: { description: 'Lead not found' }
        }
      },
      delete: {
        tags: ['Leads'],
        summary: 'Delete a lead (admin/company_admin only)',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
        responses: {
          200: { description: 'Lead deleted' },
          403: { description: 'Insufficient permissions' }
        }
      }
    },
    '/api/leads/create': {
      post: {
        tags: ['WordPress Integration'],
        summary: 'Submit a lead from WordPress (Contact Form 7, Elementor, WPForms, Gravity Forms)',
        security: [{ apiKey: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['name'],
                properties: {
                  name: { type: 'string', example: 'John Doe' },
                  email: { type: 'string', format: 'email' },
                  phone: { type: 'string', example: '+123456789' },
                  subject: { type: 'string', example: 'Roof Repair' },
                  message: { type: 'string', example: 'Need a quote' },
                  source: { type: 'string', example: 'Contact Form 7' }
                }
              }
            }
          }
        },
        responses: {
          201: { description: 'Lead created and notification sent' },
          400: { description: 'Missing required field' },
          401: { description: 'Invalid API key' }
        }
      }
    },
    '/api/leads/facebook': {
      get: {
        tags: ['Facebook Lead Ads'],
        summary: 'Webhook verification (Facebook hub.challenge)',
        security: [],
        parameters: [
          { name: 'hub.mode', in: 'query', schema: { type: 'string' } },
          { name: 'hub.verify_token', in: 'query', schema: { type: 'string' } },
          { name: 'hub.challenge', in: 'query', schema: { type: 'string' } }
        ],
        responses: {
          200: { description: 'Returns hub.challenge value' },
          403: { description: 'Verification failed' }
        }
      },
      post: {
        tags: ['Facebook Lead Ads'],
        summary: 'Receive Facebook Lead Ads webhook events',
        security: [],
        requestBody: {
          content: {
            'application/json': {
              schema: {
                type: 'object',
                description: 'Facebook leadgen webhook payload'
              }
            }
          }
        },
        responses: {
          200: { description: 'Events processed' }
        }
      }
    },
    '/api/leads/bulk': {
      post: {
        tags: ['Leads'],
        summary: 'Perform bulk actions on leads (assign, update_status, delete)',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['action', 'leadIds'],
                properties: {
                  action: { type: 'string', enum: ['assign', 'update_status', 'delete'] },
                  leadIds: { type: 'array', items: { type: 'integer' } },
                  assignedTo: { type: 'integer', description: 'Required for assign action' },
                  status: { type: 'string', description: 'Required for update_status action' }
                }
              }
            }
          }
        },
        responses: {
          200: { description: 'Bulk action completed' }
        }
      }
    },
    '/api/notifications': {
      get: {
        tags: ['Notifications'],
        summary: 'Get user notifications',
        parameters: [
          { name: 'unread', in: 'query', schema: { type: 'boolean' } },
          { name: 'limit', in: 'query', schema: { type: 'integer', default: 50 } }
        ],
        responses: {
          200: {
            description: 'Notification list',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    notifications: { type: 'array', items: { $ref: '#/components/schemas/Notification' } },
                    unreadCount: { type: 'integer' }
                  }
                }
              }
            }
          }
        }
      },
      post: {
        tags: ['Notifications'],
        summary: 'Mark notifications as read',
        requestBody: {
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  notificationIds: { type: 'array', items: { type: 'integer' } },
                  markAll: { type: 'boolean', description: 'Mark all as read' }
                }
              }
            }
          }
        },
        responses: {
          200: { description: 'Notifications marked as read' }
        }
      }
    },
    '/api/reports': {
      get: {
        tags: ['Reports'],
        summary: 'Get dashboard KPIs and chart data',
        responses: {
          200: {
            description: 'Report data',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    summary: {
                      type: 'object',
                      properties: {
                        totalLeads: { type: 'integer' },
                        newLeads: { type: 'integer' },
                        qualifiedLeads: { type: 'integer' },
                        convertedLeads: { type: 'integer' },
                        lostLeads: { type: 'integer' },
                        followupsToday: { type: 'integer' },
                        conversionRate: { type: 'number' }
                      }
                    },
                    charts: {
                      type: 'object',
                      properties: {
                        leadsByMonth: { type: 'array' },
                        leadsBySource: { type: 'array' },
                        leadPipeline: { type: 'array' },
                        teamPerformance: { type: 'array' }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    },
    '/api/users': {
      get: {
        tags: ['Users'],
        summary: 'List company users',
        responses: {
          200: { description: 'User list', content: { 'application/json': { schema: { type: 'object', properties: { users: { type: 'array', items: { $ref: '#/components/schemas/User' } } } } } } }
        }
      },
      post: {
        tags: ['Users'],
        summary: 'Create a new staff/admin user',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['name', 'email', 'password', 'role'],
                properties: {
                  name: { type: 'string' },
                  email: { type: 'string', format: 'email' },
                  password: { type: 'string', minLength: 6 },
                  role: { type: 'string', enum: ['company_admin', 'staff'] },
                  phone: { type: 'string' }
                }
              }
            }
          }
        },
        responses: {
          201: { description: 'User created' },
          409: { description: 'Email already in use' }
        }
      }
    },
    '/api/settings/company': {
      get: {
        tags: ['Settings'],
        summary: 'Get company settings',
        responses: { 200: { description: 'Company data' } }
      },
      put: {
        tags: ['Settings'],
        summary: 'Update company settings (including Facebook Page ID and Access Token)',
        requestBody: {
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  company_name: { type: 'string' },
                  website: { type: 'string' },
                  email: { type: 'string', format: 'email' },
                  phone: { type: 'string' },
                  facebook_page_id: { type: 'string', description: 'Facebook Page ID for Lead Ads integration' },
                  facebook_access_token: { type: 'string', description: 'Facebook Page Access Token' }
                }
              }
            }
          }
        },
        responses: { 200: { description: 'Settings saved' } }
      },
      post: {
        tags: ['Settings'],
        summary: 'Regenerate WordPress API key',
        responses: { 200: { description: 'New API key returned', content: { 'application/json': { schema: { type: 'object', properties: { api_key: { type: 'string' } } } } } } }
      }
    },
    '/api/admin/companies': {
      get: {
        tags: ['Admin'],
        summary: 'List all companies (super_admin only)',
        responses: { 200: { description: 'All companies with stats' } }
      },
      post: {
        tags: ['Admin'],
        summary: 'Provision a new company tenant (super_admin only)',
        requestBody: {
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['company_name', 'admin_name', 'admin_email', 'admin_password'],
                properties: {
                  company_name: { type: 'string' },
                  website: { type: 'string' },
                  email: { type: 'string', format: 'email' },
                  phone: { type: 'string' },
                  subscription_plan: { type: 'string', enum: ['free', 'professional', 'enterprise'] },
                  admin_name: { type: 'string' },
                  admin_email: { type: 'string', format: 'email' },
                  admin_password: { type: 'string', minLength: 6 }
                }
              }
            }
          }
        },
        responses: { 201: { description: 'Company and admin user created' } }
      }
    },
    '/api/admin/companies/{id}': {
      put: {
        tags: ['Admin'],
        summary: 'Update company status (activate/suspend)',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
        requestBody: {
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  status: { type: 'string', enum: ['active', 'suspended'] }
                }
              }
            }
          }
        },
        responses: { 200: { description: 'Company updated' } }
      }
    }
  }
};

export async function GET() {
  return NextResponse.json(openApiSpec, {
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*'
    }
  });
}
