// Swagger API Specification for Math Learning App Backend

const userSchema = {
  type: 'object',
  properties: {
    id: { type: 'string', format: 'uuid' },
    username: { type: 'string' },
    email: { type: 'string', format: 'email' },
    country: { type: 'string', nullable: true },
    account_status: { type: 'string' },
    preferred_subject_id: { type: 'integer', nullable: true },
    role_id: { type: 'integer' },
    role: { type: 'string' },
    learn_unit_id: { type: 'string', format: 'uuid', nullable: true },
    slots_purchased: { type: 'integer' },
    created_at: { type: 'string', format: 'date-time' },
    permissions: {
      type: 'object',
      additionalProperties: {
        type: 'array',
        items: { type: 'string' }
      }
    }
  }
};

const lessonSchema = {
  type: 'object',
  properties: {
    id: { type: 'string', format: 'uuid' },
    grade_id: { type: 'integer' },
    subject_id: { type: 'integer' },
    title_en: { type: 'string' },
    title_vi: { type: 'string' },
    content_markdown_en: { type: 'string' },
    content_markdown_vi: { type: 'string' },
    order_index: { type: 'integer', nullable: true },
    is_premium: { type: 'boolean' },
    created_by: { type: 'string', format: 'uuid', nullable: true },
    updated_at: { type: 'string', format: 'date-time' }
  }
};

const subjectSchema = {
  type: 'object',
  properties: {
    id: { type: 'integer' },
    slug: { type: 'string' },
    title_en: { type: 'string' },
    title_vi: { type: 'string' },
    color: { type: 'string', nullable: true },
    is_classified: { type: 'boolean' },
    created_by: { type: 'string', format: 'uuid', nullable: true }
  }
};

const gradeSchema = {
  type: 'object',
  properties: {
    id: { type: 'integer' },
    slug: { type: 'string' },
    title_en: { type: 'string' },
    title_vi: { type: 'string' },
    subject_id: { type: 'integer', nullable: true },
    created_by: { type: 'string', format: 'uuid', nullable: true }
  }
};

const questionTemplateSchema = {
  type: 'object',
  properties: {
    id: { type: 'string', format: 'uuid' },
    lesson_id: { type: 'string', format: 'uuid', nullable: true },
    created_by: { type: 'string', format: 'uuid', nullable: true },
    template_type: { type: 'string' },
    difficulty: { type: 'string' },
    is_premium: { type: 'boolean' },
    body_template_en: { type: 'string' },
    body_template_vi: { type: 'string' },
    explanation_template_en: { type: 'string', nullable: true },
    explanation_template_vi: { type: 'string', nullable: true },
    logic_config: { type: 'object' },
    accepted_formulas: {
      type: 'array',
      items: { type: 'string' }
    },
    created_at: { type: 'string', format: 'date-time' }
  }
};

const testAttemptSchema = {
  type: 'object',
  properties: {
    id: { type: 'string', format: 'uuid' },
    user_id: { type: 'string', format: 'uuid', nullable: true },
    lesson_id: { type: 'string', format: 'uuid', nullable: true },
    total_score: { type: 'number', format: 'float', nullable: true },
    is_completed: { type: 'boolean' },
    is_practice: { type: 'boolean' },
    started_at: { type: 'string', format: 'date-time' },
    completed_at: { type: 'string', format: 'date-time', nullable: true }
  }
};

const questionSnapshotSchema = {
  type: 'object',
  properties: {
    id: { type: 'string', format: 'uuid' },
    attempt_id: { type: 'string', format: 'uuid', nullable: true },
    template_id: { type: 'string', format: 'uuid', nullable: true },
    generated_variables: { type: 'object' },
    student_answer: { type: 'string', nullable: true },
    right_answers: {
      type: 'array',
      items: { type: 'string' }
    },
    is_correct: { type: 'boolean', nullable: true },
    points_earned: { type: 'integer', nullable: true },
    responded_at: { type: 'string', format: 'date-time', nullable: true }
  }
};

const achievementSchema = {
  type: 'object',
  properties: {
    id: { type: 'string', format: 'uuid' },
    slug: { type: 'string' },
    theme_id: { type: 'string', format: 'uuid', nullable: true },
    title_en: { type: 'string' },
    title_vi: { type: 'string' },
    description_en: { type: 'string' },
    description_vi: { type: 'string' },
    category: { type: 'string' },
    xp_reward: { type: 'integer' },
    icon: { type: 'string', nullable: true }
  }
};

const gameChallengeSchema = {
  type: 'object',
  properties: {
    id: { type: 'string', format: 'uuid' },
    code: { type: 'string' },
    game_type: { type: 'string' },
    grade_id: { type: 'integer', nullable: true },
    lesson_id: { type: 'string', format: 'uuid', nullable: true },
    created_by: { type: 'string', format: 'uuid' },
    is_active: { type: 'boolean' },
    created_at: { type: 'string', format: 'date-time' },
    config: { type: 'object' }
  }
};

const notificationSchema = {
  type: 'object',
  properties: {
    id: { type: 'string', format: 'uuid' },
    recipient_id: { type: 'string', format: 'uuid' },
    actor_id: { type: 'string', format: 'uuid', nullable: true },
    type: { type: 'string' },
    entity_type: { type: 'string', nullable: true },
    entity_id: { type: 'string', nullable: true },
    payload: { type: 'object' },
    read_at: { type: 'string', format: 'date-time', nullable: true },
    created_at: { type: 'string', format: 'date-time' }
  }
};

const planSchema = {
  type: 'object',
  properties: {
    id: { type: 'integer' },
    name: { type: 'string' },
    vi_name: { type: 'string' },
    en_name: { type: 'string' },
    description: { type: 'string', nullable: true },
    price_monthly: { type: 'number' },
    price_annually: { type: 'number' },
    max_students: { type: 'integer', nullable: true },
    max_teachers: { type: 'integer', nullable: true },
    max_lessons: { type: 'integer', nullable: true },
    max_templates: { type: 'integer', nullable: true },
    max_subjects: { type: 'integer', nullable: true },
    max_grades: { type: 'integer', nullable: true }
  }
};

const errorSchema = {
  type: 'object',
  properties: {
    error: { type: 'string' },
    details: { type: 'string' },
    message: { type: 'string' }
  }
};

// --- PATH DEFINITIONS ---

const authPaths = {
  '/api/v1/auth/register': {
    post: {
      tags: ['Authentication'],
      summary: 'Register a new user',
      description: 'Creates a new student or supervisor account.',
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['email', 'password'],
              properties: {
                email: { type: 'string', format: 'email' },
                password: { type: 'string', minLength: 6 },
                country: { type: 'string' },
                username: { type: 'string' },
                role_name: { type: 'string', enum: ['free_student', 'sub_student', 'supervisor'] },
                learn_unit_name: { type: 'string' }
              }
            }
          }
        }
      },
      responses: {
        200: {
          description: 'Registration successful',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  token: { type: 'string' },
                  user: { $ref: '#/components/schemas/User' }
                }
              }
            }
          }
        },
        400: { description: 'Validation error', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } }
      }
    }
  },
  '/api/v1/auth/activate': {
    post: {
      tags: ['Authentication'],
      summary: 'Activate account via email verification token',
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['token'],
              properties: {
                token: { type: 'string' }
              }
            }
          }
        }
      },
      responses: {
        200: {
          description: 'Account activated successfully',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  token: { type: 'string' },
                  user: { $ref: '#/components/schemas/User' }
                }
              }
            }
          }
        },
        400: { description: 'Invalid or expired token', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } }
      }
    }
  },
  '/api/v1/auth/login': {
    post: {
      tags: ['Authentication'],
      summary: 'User Login',
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['email', 'password'],
              properties: {
                email: { type: 'string', format: 'email' },
                password: { type: 'string' }
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
                  token: { type: 'string' },
                  user: { $ref: '#/components/schemas/User' }
                }
              }
            }
          }
        },
        400: { description: 'Invalid email or password', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } }
      }
    }
  },
  '/api/v1/auth/profile': {
    get: {
      tags: ['Authentication'],
      summary: 'Get current user profile',
      security: [{ bearerAuth: [] }],
      responses: {
        200: {
          description: 'Successful profile retrieval',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  user: { $ref: '#/components/schemas/User' }
                }
              }
            }
          }
        },
        401: { description: 'Unauthorized' }
      }
    }
  },
  '/api/v1/auth/refresh': {
    post: {
      tags: ['Authentication'],
      summary: 'Refresh session/token',
      security: [{ bearerAuth: [] }],
      responses: {
        200: {
          description: 'Token refreshed',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  token: { type: 'string' },
                  user: { $ref: '#/components/schemas/User' }
                }
              }
            }
          }
        },
        401: { description: 'Unauthorized' }
      }
    }
  },
  '/api/v1/auth/subject-preference': {
    patch: {
      tags: ['Authentication'],
      summary: 'Update subject preference',
      security: [{ bearerAuth: [] }],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['preferred_subject_id'],
              properties: {
                preferred_subject_id: { type: 'integer' }
              }
            }
          }
        }
      },
      responses: {
        200: {
          description: 'Preference updated',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  user: { $ref: '#/components/schemas/User' }
                }
              }
            }
          }
        },
        401: { description: 'Unauthorized' }
      }
    }
  },
  '/api/v1/auth/permissions/{userId}': {
    get: {
      tags: ['Authentication'],
      summary: 'Get permissions for a user',
      parameters: [
        {
          name: 'userId',
          in: 'path',
          required: true,
          schema: { type: 'string', format: 'uuid' }
        }
      ],
      responses: {
        200: {
          description: 'Permissions retrieved',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  role: { type: 'string' },
                  permissions: {
                    type: 'object',
                    additionalProperties: {
                      type: 'array',
                      items: { type: 'string' }
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
  '/api/v1/auth/upgrade-role': {
    post: {
      tags: ['Authentication'],
      summary: 'Upgrade role (e.g. to supervisor)',
      security: [{ bearerAuth: [] }],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['requested_role'],
              properties: {
                requested_role: { type: 'string', enum: ['supervisor'] },
                learn_unit_name: { type: 'string' }
              }
            }
          }
        }
      },
      responses: {
        200: {
          description: 'Upgrade successful',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  token: { type: 'string' },
                  user: { $ref: '#/components/schemas/User' }
                }
              }
            }
          }
        },
        400: { description: 'Error' }
      }
    }
  },
  '/api/v1/auth/password': {
    patch: {
      tags: ['Authentication'],
      summary: 'Change password',
      security: [{ bearerAuth: [] }],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['currentPassword', 'newPassword'],
              properties: {
                currentPassword: { type: 'string' },
                newPassword: { type: 'string', minLength: 6 }
              }
            }
          }
        }
      },
      responses: {
        200: {
          description: 'Password changed successfully',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  message: { type: 'string' }
                }
              }
            }
          }
        },
        400: { description: 'Invalid current password' }
      }
    }
  },
  '/api/v1/auth/activity': {
    get: {
      tags: ['Authentication'],
      summary: 'Get activity logs and learning time stats',
      security: [{ bearerAuth: [] }],
      responses: {
        200: {
          description: 'Activity stats retrieved',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  total_xp: { type: 'integer' },
                  xp_by_reason: { type: 'object' },
                  study_time: { type: 'array', items: { type: 'object' } }
                }
              }
            }
          }
        }
      }
    }
  },
  '/api/v1/auth/socializing': {
    get: {
      tags: ['Authentication'],
      summary: 'Get follow/follower social status',
      security: [{ bearerAuth: [] }],
      responses: {
        200: {
          description: 'Social metadata retrieved',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  followers: { type: 'array', items: { type: 'object' } },
                  following: { type: 'array', items: { type: 'object' } }
                }
              }
            }
          }
        }
      }
    }
  },
  '/api/v1/auth/follow/{targetUserId}': {
    post: {
      tags: ['Authentication'],
      summary: 'Follow a user',
      security: [{ bearerAuth: [] }],
      parameters: [
        {
          name: 'targetUserId',
          in: 'path',
          required: true,
          schema: { type: 'string', format: 'uuid' }
        }
      ],
      responses: {
        200: { description: 'Followed successfully' },
        400: { description: 'Invalid request' }
      }
    },
    delete: {
      tags: ['Authentication'],
      summary: 'Unfollow a user',
      security: [{ bearerAuth: [] }],
      parameters: [
        {
          name: 'targetUserId',
          in: 'path',
          required: true,
          schema: { type: 'string', format: 'uuid' }
        }
      ],
      responses: {
        200: { description: 'Unfollowed successfully' }
      }
    }
  }
};

const lessonPaths = {
  '/api/v1/lessons': {
    get: {
      tags: ['Lessons'],
      summary: 'Get paginated lessons catalog',
      security: [{ bearerAuth: [] }],
      parameters: [
        { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
        { name: 'pageSize', in: 'query', schema: { type: 'integer', default: 10 } },
        { name: 'gradeId', in: 'query', schema: { type: 'integer' } },
        { name: 'subjectId', in: 'query', schema: { type: 'integer' } },
        { name: 'search', in: 'query', schema: { type: 'string' } }
      ],
      responses: {
        200: {
          description: 'List of lessons',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  lessons: { type: 'array', items: { $ref: '#/components/schemas/Lesson' } },
                  total: { type: 'integer' },
                  page: { type: 'integer' },
                  totalPages: { type: 'integer' }
                }
              }
            }
          }
        }
      }
    },
    post: {
      tags: ['Lessons'],
      summary: 'Create a new lesson',
      security: [{ bearerAuth: [] }],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['grade_id', 'subject_id', 'title_en', 'title_vi', 'content_markdown_en', 'content_markdown_vi'],
              properties: {
                grade_id: { type: 'integer' },
                subject_id: { type: 'integer' },
                title_en: { type: 'string' },
                title_vi: { type: 'string' },
                content_markdown_en: { type: 'string' },
                content_markdown_vi: { type: 'string' },
                order_index: { type: 'integer' },
                is_premium: { type: 'boolean' }
              }
            }
          }
        }
      },
      responses: {
        201: {
          description: 'Lesson created successfully',
          content: { 'application/json': { schema: { $ref: '#/components/schemas/Lesson' } } }
        },
        403: { description: 'Forbidden / Insufficient permissions' }
      }
    }
  },
  '/api/v1/lessons/grades': {
    get: {
      tags: ['Lessons'],
      summary: 'Get grades list',
      security: [{ bearerAuth: [] }],
      responses: {
        200: {
          description: 'List of grades',
          content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/Grade' } } } }
        }
      }
    },
    post: {
      tags: ['Lessons'],
      summary: 'Create a grade',
      security: [{ bearerAuth: [] }],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['slug', 'title_en', 'title_vi'],
              properties: {
                slug: { type: 'string' },
                title_en: { type: 'string' },
                title_vi: { type: 'string' },
                subject_id: { type: 'integer' }
              }
            }
          }
        }
      },
      responses: {
        201: {
          description: 'Grade created successfully',
          content: { 'application/json': { schema: { $ref: '#/components/schemas/Grade' } } }
        }
      }
    }
  },
  '/api/v1/lessons/subjects': {
    get: {
      tags: ['Lessons'],
      summary: 'Get authorized subjects list for current user',
      security: [{ bearerAuth: [] }],
      responses: {
        200: {
          description: 'List of subjects',
          content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/Subject' } } } }
        }
      }
    },
    post: {
      tags: ['Lessons'],
      summary: 'Create a subject',
      security: [{ bearerAuth: [] }],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['slug', 'title_en', 'title_vi'],
              properties: {
                slug: { type: 'string' },
                title_en: { type: 'string' },
                title_vi: { type: 'string' },
                color: { type: 'string' },
                is_classified: { type: 'boolean' }
              }
            }
          }
        }
      },
      responses: {
        201: {
          description: 'Subject created successfully',
          content: { 'application/json': { schema: { $ref: '#/components/schemas/Subject' } } }
        }
      }
    }
  },
  '/api/v1/lessons/subjects/catalog': {
    get: {
      tags: ['Lessons'],
      summary: 'Get catalog of all subjects',
      security: [{ bearerAuth: [] }],
      responses: {
        200: {
          description: 'Catalog of all subjects',
          content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/Subject' } } } }
        }
      }
    }
  },
  '/api/v1/lessons/subjects/{id}': {
    patch: {
      tags: ['Lessons'],
      summary: 'Update subject details',
      security: [{ bearerAuth: [] }],
      parameters: [
        { name: 'id', in: 'path', required: true, schema: { type: 'integer' } }
      ],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                title_en: { type: 'string' },
                title_vi: { type: 'string' },
                color: { type: 'string' },
                is_classified: { type: 'boolean' }
              }
            }
          }
        }
      },
      responses: {
        200: {
          description: 'Subject updated successfully',
          content: { 'application/json': { schema: { $ref: '#/components/schemas/Subject' } } }
        }
      }
    }
  },
  '/api/v1/lessons/subjects/{id}/request-access': {
    post: {
      tags: ['Lessons'],
      summary: 'Request access to a classified subject',
      security: [{ bearerAuth: [] }],
      parameters: [
        { name: 'id', in: 'path', required: true, schema: { type: 'integer' } }
      ],
      responses: {
        201: { description: 'Access request created' },
        400: { description: 'Access request already exists or invalid' }
      }
    }
  },
  '/api/v1/lessons/practice-available': {
    get: {
      tags: ['Lessons'],
      summary: 'Get available practice lessons',
      security: [{ bearerAuth: [] }],
      parameters: [
        { name: 'gradeId', in: 'query', schema: { type: 'integer' } },
        { name: 'subjectId', in: 'query', schema: { type: 'integer' } }
      ],
      responses: {
        200: {
          description: 'List of practice-available lessons',
          content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/Lesson' } } } }
        }
      }
    }
  },
  '/api/v1/lessons/{id}': {
    get: {
      tags: ['Lessons'],
      summary: 'Get lesson details by ID',
      security: [{ bearerAuth: [] }],
      parameters: [
        { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }
      ],
      responses: {
        200: {
          description: 'Lesson details',
          content: { 'application/json': { schema: { $ref: '#/components/schemas/Lesson' } } }
        },
        404: { description: 'Lesson not found' }
      }
    },
    put: {
      tags: ['Lessons'],
      summary: 'Update an existing lesson',
      security: [{ bearerAuth: [] }],
      parameters: [
        { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }
      ],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['grade_id', 'subject_id', 'title_en', 'title_vi', 'content_markdown_en', 'content_markdown_vi'],
              properties: {
                grade_id: { type: 'integer' },
                subject_id: { type: 'integer' },
                title_en: { type: 'string' },
                title_vi: { type: 'string' },
                content_markdown_en: { type: 'string' },
                content_markdown_vi: { type: 'string' },
                order_index: { type: 'integer' },
                is_premium: { type: 'boolean' }
              }
            }
          }
        }
      },
      responses: {
        200: {
          description: 'Lesson updated successfully',
          content: { 'application/json': { schema: { $ref: '#/components/schemas/Lesson' } } }
        }
      }
    },
    delete: {
      tags: ['Lessons'],
      summary: 'Delete a lesson',
      security: [{ bearerAuth: [] }],
      parameters: [
        { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }
      ],
      responses: {
        200: { description: 'Lesson deleted successfully' }
      }
    }
  },
  '/api/v1/lessons/{id}/practice': {
    post: {
      tags: ['Lessons'],
      summary: 'Start a practice attempt on a lesson',
      security: [{ bearerAuth: [] }],
      parameters: [
        { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }
      ],
      responses: {
        200: {
          description: 'Practice attempt started',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  attemptId: { type: 'string', format: 'uuid' },
                  snapshots: { type: 'array', items: { $ref: '#/components/schemas/QuestionSnapshot' } }
                }
              }
            }
          }
        }
      }
    }
  },
  '/api/v1/lessons/mastery/all': {
    get: {
      tags: ['Lessons'],
      summary: 'Get all user lesson masteries',
      security: [{ bearerAuth: [] }],
      responses: {
        200: {
          description: 'Lesson mastery details retrieved'
        }
      }
    }
  },
  '/api/v1/lessons/{id}/study-time': {
    post: {
      tags: ['Lessons'],
      summary: 'Log study time for a lesson',
      security: [{ bearerAuth: [] }],
      parameters: [
        { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }
      ],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['duration_sec'],
              properties: {
                duration_sec: { type: 'integer' }
              }
            }
          }
        }
      },
      responses: {
        200: { description: 'Study time logged' }
      }
    }
  }
};

const testPaths = {
  '/api/v1/tests/grade-tests': {
    get: {
      tags: ['Tests'],
      summary: 'Get available grade tests',
      security: [{ bearerAuth: [] }],
      parameters: [
        { name: 'gradeId', in: 'query', schema: { type: 'integer' } }
      ],
      responses: {
        200: { description: 'Available grade tests list' }
      }
    }
  },
  '/api/v1/tests/grade-tests/{gradeId}/start': {
    post: {
      tags: ['Tests'],
      summary: 'Start a test attempt for a specific grade level',
      security: [{ bearerAuth: [] }],
      parameters: [
        { name: 'gradeId', in: 'path', required: true, schema: { type: 'integer' } }
      ],
      responses: {
        200: {
          description: 'Test attempt started',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  attemptId: { type: 'string', format: 'uuid' },
                  snapshots: { type: 'array', items: { $ref: '#/components/schemas/QuestionSnapshot' } }
                }
              }
            }
          }
        }
      }
    }
  },
  '/api/v1/tests/attempts/{id}': {
    get: {
      tags: ['Tests'],
      summary: 'Get details of a test/practice attempt',
      security: [{ bearerAuth: [] }],
      parameters: [
        { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }
      ],
      responses: {
        200: {
          description: 'Attempt details',
          content: { 'application/json': { schema: { $ref: '#/components/schemas/TestAttempt' } } }
        }
      }
    }
  },
  '/api/v1/tests/submit-answer': {
    post: {
      tags: ['Tests'],
      summary: 'Submit answer to a snapshot question',
      security: [{ bearerAuth: [] }],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['attemptId', 'snapshotId', 'studentAnswer'],
              properties: {
                attemptId: { type: 'string', format: 'uuid' },
                snapshotId: { type: 'string', format: 'uuid' },
                studentAnswer: { type: 'string' }
              }
            }
          }
        }
      },
      responses: {
        200: {
          description: 'Question grading response',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  isCorrect: { type: 'boolean' },
                  pointsEarned: { type: 'integer' },
                  rightAnswers: { type: 'array', items: { type: 'string' } },
                  explanation: { type: 'string', nullable: true }
                }
              }
            }
          }
        }
      }
    }
  },
  '/api/v1/tests/attempts/{id}/finish': {
    post: {
      tags: ['Tests'],
      summary: 'Complete a test or practice attempt',
      security: [{ bearerAuth: [] }],
      parameters: [
        { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }
      ],
      responses: {
        200: {
          description: 'Finished attempt summaries and stats',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  attempt: { $ref: '#/components/schemas/TestAttempt' },
                  performanceScore: { type: 'number' },
                  xpEarned: { type: 'integer' },
                  unlockedAchievements: { type: 'array', items: { type: 'string' } }
                }
              }
            }
          }
        }
      }
    }
  },
  '/api/v1/tests/templates': {
    get: {
      tags: ['Tests'],
      summary: 'Get paginated question templates',
      security: [{ bearerAuth: [] }],
      parameters: [
        { name: 'lessonId', in: 'query', schema: { type: 'string', format: 'uuid' } },
        { name: 'difficulty', in: 'query', schema: { type: 'string' } },
        { name: 'templateType', in: 'query', schema: { type: 'string' } },
        { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
        { name: 'pageSize', in: 'query', schema: { type: 'integer', default: 10 } }
      ],
      responses: {
        200: {
          description: 'List of templates',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  templates: { type: 'array', items: { $ref: '#/components/schemas/QuestionTemplate' } },
                  total: { type: 'integer' },
                  page: { type: 'integer' },
                  totalPages: { type: 'integer' }
                }
              }
            }
          }
        }
      }
    },
    post: {
      tags: ['Tests'],
      summary: 'Create a new question template',
      security: [{ bearerAuth: [] }],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['template_type', 'body_template_en', 'body_template_vi'],
              properties: {
                lesson_id: { type: 'string', format: 'uuid' },
                template_type: { type: 'string' },
                difficulty: { type: 'string', enum: ['easy', 'medium', 'hard'] },
                is_premium: { type: 'boolean' },
                body_template_en: { type: 'string' },
                body_template_vi: { type: 'string' },
                explanation_template_en: { type: 'string' },
                explanation_template_vi: { type: 'string' },
                logic_config: { type: 'object' },
                accepted_formulas: { type: 'array', items: { type: 'string' } }
              }
            }
          }
        }
      },
      responses: {
        201: {
          description: 'Created successfully',
          content: { 'application/json': { schema: { $ref: '#/components/schemas/QuestionTemplate' } } }
        }
      }
    }
  },
  '/api/v1/tests/templates/{id}': {
    get: {
      tags: ['Tests'],
      summary: 'Get question template by ID',
      security: [{ bearerAuth: [] }],
      parameters: [
        { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }
      ],
      responses: {
        200: {
          description: 'Template details',
          content: { 'application/json': { schema: { $ref: '#/components/schemas/QuestionTemplate' } } }
        }
      }
    },
    put: {
      tags: ['Tests'],
      summary: 'Update a question template',
      security: [{ bearerAuth: [] }],
      parameters: [
        { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }
      ],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['template_type', 'body_template_en', 'body_template_vi'],
              properties: {
                lesson_id: { type: 'string', format: 'uuid' },
                template_type: { type: 'string' },
                difficulty: { type: 'string', enum: ['easy', 'medium', 'hard'] },
                is_premium: { type: 'boolean' },
                body_template_en: { type: 'string' },
                body_template_vi: { type: 'string' },
                explanation_template_en: { type: 'string' },
                explanation_template_vi: { type: 'string' },
                logic_config: { type: 'object' },
                accepted_formulas: { type: 'array', items: { type: 'string' } }
              }
            }
          }
        }
      },
      responses: {
        200: {
          description: 'Updated successfully',
          content: { 'application/json': { schema: { $ref: '#/components/schemas/QuestionTemplate' } } }
        }
      }
    },
    delete: {
      tags: ['Tests'],
      summary: 'Delete a question template',
      security: [{ bearerAuth: [] }],
      parameters: [
        { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }
      ],
      responses: {
        200: { description: 'Deleted successfully' }
      }
    }
  },
  '/api/v1/tests/templates/filters': {
    get: {
      tags: ['Tests'],
      summary: 'Get distinct template filters',
      security: [{ bearerAuth: [] }],
      responses: {
        200: {
          description: 'Distinct list of lessons, template types, and difficulties'
        }
      }
    }
  },
  '/api/v1/tests/question-reports': {
    post: {
      tags: ['Tests'],
      summary: 'File a bug report for a question',
      security: [{ bearerAuth: [] }],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['template_id', 'reason'],
              properties: {
                template_id: { type: 'string', format: 'uuid' },
                snapshot_id: { type: 'string', format: 'uuid' },
                attempt_id: { type: 'string', format: 'uuid' },
                lesson_id: { type: 'string', format: 'uuid' },
                reason: { type: 'string' }
              }
            }
          }
        }
      },
      responses: {
        201: { description: 'Report filed successfully' }
      }
    },
    get: {
      tags: ['Tests'],
      summary: 'Get question reports list',
      security: [{ bearerAuth: [] }],
      parameters: [
        { name: 'status', in: 'query', schema: { type: 'string', enum: ['open', 'resolved'] } }
      ],
      responses: {
        200: { description: 'List of reports' }
      }
    }
  },
  '/api/v1/tests/question-reports/{id}': {
    patch: {
      tags: ['Tests'],
      summary: 'Update report status (resolve report)',
      security: [{ bearerAuth: [] }],
      parameters: [
        { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }
      ],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['status'],
              properties: {
                status: { type: 'string', enum: ['resolved', 'open'] }
              }
            }
          }
        }
      },
      responses: {
        200: { description: 'Report status updated' }
      }
    }
  },
  '/api/v1/tests/my-practice-history': {
    get: {
      tags: ['Tests'],
      summary: 'Get practice attempts history of user',
      security: [{ bearerAuth: [] }],
      parameters: [
        { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
        { name: 'pageSize', in: 'query', schema: { type: 'integer', default: 10 } }
      ],
      responses: {
        200: { description: 'Paginated list of user practice history attempts' }
      }
    }
  }
};

const achievementPaths = {
  '/api/v1/achievements': {
    get: {
      tags: ['Achievements'],
      summary: 'Get all achievements details',
      security: [{ bearerAuth: [] }],
      responses: {
        200: {
          description: 'All system achievements',
          content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/Achievement' } } } }
        }
      }
    }
  },
  '/api/v1/achievements/my': {
    get: {
      tags: ['Achievements'],
      summary: 'Get current user earned achievements',
      security: [{ bearerAuth: [] }],
      responses: {
        200: {
          description: 'User achievements metadata'
        }
      }
    }
  },
  '/api/v1/achievements/check': {
    post: {
      tags: ['Achievements'],
      summary: 'Trigger checking for general achievements',
      security: [{ bearerAuth: [] }],
      responses: {
        200: {
          description: 'Achievements checked',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  newAchievements: { type: 'array', items: { type: 'string' } }
                }
              }
            }
          }
        }
      }
    }
  },
  '/api/v1/achievements/seed': {
    post: {
      tags: ['Achievements'],
      summary: 'Seed standard achievements',
      security: [{ bearerAuth: [] }],
      responses: {
        200: { description: 'Achievements database seeded successfully' }
      }
    }
  }
};

const gamePaths = {
  '/api/v1/games/available': {
    get: {
      tags: ['Games'],
      summary: 'Get available game levels and challenges',
      security: [{ bearerAuth: [] }],
      responses: {
        200: { description: 'Active maps / active game modes list' }
      }
    }
  },
  '/api/v1/games/challenges': {
    post: {
      tags: ['Games'],
      summary: 'Create a game challenge',
      security: [{ bearerAuth: [] }],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['game_type'],
              properties: {
                game_type: { type: 'string', enum: ['speed', 'climb', 'match'] },
                grade_id: { type: 'integer' },
                lesson_id: { type: 'string', format: 'uuid' },
                config: { type: 'object' }
              }
            }
          }
        }
      },
      responses: {
        201: {
          description: 'Challenge created successfully',
          content: { 'application/json': { schema: { $ref: '#/components/schemas/GameChallenge' } } }
        }
      }
    }
  },
  '/api/v1/games/mine': {
    get: {
      tags: ['Games'],
      summary: 'Get user created game challenges',
      security: [{ bearerAuth: [] }],
      responses: {
        200: {
          description: 'List of challenges',
          content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/GameChallenge' } } } }
        }
      }
    }
  },
  '/api/v1/games/challenges/{id}/archive': {
    patch: {
      tags: ['Games'],
      summary: 'Archive/deactivate a challenge',
      security: [{ bearerAuth: [] }],
      parameters: [
        { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }
      ],
      responses: {
        200: { description: 'Challenge archived' }
      }
    }
  },
  '/api/v1/games/challenges/{code}': {
    get: {
      tags: ['Games'],
      summary: 'Get challenge details by code',
      parameters: [
        { name: 'code', in: 'path', required: true, schema: { type: 'string' } }
      ],
      responses: {
        200: {
          description: 'Challenge metadata details',
          content: { 'application/json': { schema: { $ref: '#/components/schemas/GameChallenge' } } }
        }
      }
    }
  },
  '/api/v1/games/attempts': {
    post: {
      tags: ['Games'],
      summary: 'Post a game play score attempt',
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['challenge_id', 'score', 'time_spent'],
              properties: {
                challenge_id: { type: 'string', format: 'uuid' },
                guest_name: { type: 'string' },
                guest_token: { type: 'string' },
                score: { type: 'integer' },
                time_spent: { type: 'integer' }
              }
            }
          }
        }
      },
      responses: {
        201: { description: 'Score attempt recorded' }
      }
    }
  },
  '/api/v1/games/global-leaderboard': {
    get: {
      tags: ['Games'],
      summary: 'Get global leaderboard stats',
      security: [{ bearerAuth: [] }],
      responses: {
        200: { description: 'Global XP leaders data' }
      }
    }
  }
};

const notificationPaths = {
  '/api/v1/notifications': {
    get: {
      tags: ['Notifications'],
      summary: 'Get notification feeds',
      security: [{ bearerAuth: [] }],
      parameters: [
        { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
        { name: 'pageSize', in: 'query', schema: { type: 'integer', default: 10 } }
      ],
      responses: {
        200: {
          description: 'Notifications list',
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
    }
  },
  '/api/v1/notifications/{id}/read': {
    patch: {
      tags: ['Notifications'],
      summary: 'Mark notification as read',
      security: [{ bearerAuth: [] }],
      parameters: [
        { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }
      ],
      responses: {
        200: {
          description: 'Notification marked as read',
          content: { 'application/json': { schema: { $ref: '#/components/schemas/Notification' } } }
        }
      }
    }
  },
  '/api/v1/notifications/read-all': {
    post: {
      tags: ['Notifications'],
      summary: 'Mark all unread notifications as read',
      security: [{ bearerAuth: [] }],
      responses: {
        200: {
          description: 'All read status count response',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  updated: { type: 'integer' }
                }
              }
            }
          }
        }
      }
    }
  }
};

const subscriptionPaths = {
  '/api/v1/subscription/plans': {
    get: {
      tags: ['Subscription'],
      summary: 'Get available subscription plans list',
      responses: {
        200: {
          description: 'Pricing plans details metadata',
          content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/Plan' } } } }
        }
      }
    }
  },
  '/api/v1/subscription/details': {
    get: {
      tags: ['Subscription'],
      summary: 'Get current user active subscription metadata',
      security: [{ bearerAuth: [] }],
      responses: {
        200: { description: 'Active plan details' }
      }
    }
  },
  '/api/v1/subscription/toggle-auto-renew': {
    post: {
      tags: ['Subscription'],
      summary: 'Toggle auto-renew on active plan subscription',
      security: [{ bearerAuth: [] }],
      responses: {
        200: { description: 'Subscription auto renew status updated successfully' }
      }
    }
  },
  '/api/v1/subscription/checkout': {
    post: {
      tags: ['Subscription'],
      summary: 'Perform mock plan checkout payment',
      security: [{ bearerAuth: [] }],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['plan_id', 'billing_cycle'],
              properties: {
                plan_id: { type: 'integer' },
                billing_cycle: { type: 'string', enum: ['monthly', 'annually'] },
                slots_purchased: { type: 'integer' },
                customized_limits: { type: 'object' }
              }
            }
          }
        }
      },
      responses: {
        200: { description: 'Checkout successful (simulated)' }
      }
    }
  }
};

const supervisorPaths = {
  '/api/v1/supervisor/buy-slots': {
    post: {
      tags: ['Supervisor'],
      summary: 'Buy slots to assign to supervised students',
      security: [{ bearerAuth: [] }],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['slots'],
              properties: {
                slots: { type: 'integer', minimum: 1 }
              }
            }
          }
        }
      },
      responses: {
        200: { description: 'Slots purchased' }
      }
    }
  },
  '/api/v1/supervisor/members': {
    post: {
      tags: ['Supervisor'],
      summary: 'Create supervised student user accounts',
      security: [{ bearerAuth: [] }],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['email', 'password'],
              properties: {
                email: { type: 'string', format: 'email' },
                password: { type: 'string', minLength: 6 },
                username: { type: 'string' },
                country: { type: 'string' }
              }
            }
          }
        }
      },
      responses: {
        201: {
          description: 'Member created successfully',
          content: { 'application/json': { schema: { $ref: '#/components/schemas/User' } } }
        }
      }
    },
    get: {
      tags: ['Supervisor'],
      summary: 'Get supervised students members list',
      security: [{ bearerAuth: [] }],
      responses: {
        200: {
          description: 'Supervisor members lists metadata'
        }
      }
    }
  },
  '/api/v1/supervisor/members/{id}/assign-seat': {
    post: {
      tags: ['Supervisor'],
      summary: 'Assign slot seat to a supervisor member',
      security: [{ bearerAuth: [] }],
      parameters: [
        { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }
      ],
      responses: {
        200: { description: 'Seat assigned successfully' }
      }
    }
  },
  '/api/v1/supervisor/members/{id}/unassign-seat': {
    post: {
      tags: ['Supervisor'],
      summary: 'Unassign slot seat from a supervisor member',
      security: [{ bearerAuth: [] }],
      parameters: [
        { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }
      ],
      responses: {
        200: { description: 'Seat unassigned successfully' }
      }
    }
  }
};

const adminPaths = {
  '/api/v1/admin/roles': {
    get: {
      tags: ['Admin'],
      summary: 'List roles',
      security: [{ bearerAuth: [] }],
      responses: {
        200: { description: 'Roles list details' }
      }
    }
  },
  '/api/v1/admin/users': {
    get: {
      tags: ['Admin'],
      summary: 'Get paginated list of users',
      security: [{ bearerAuth: [] }],
      parameters: [
        { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
        { name: 'pageSize', in: 'query', schema: { type: 'integer', default: 10 } },
        { name: 'search', in: 'query', schema: { type: 'string' } },
        { name: 'roleId', in: 'query', schema: { type: 'integer' } },
        { name: 'status', in: 'query', schema: { type: 'string' } }
      ],
      responses: {
        200: { description: 'Users page details' }
      }
    },
    post: {
      tags: ['Admin'],
      summary: 'Create a new user',
      security: [{ bearerAuth: [] }],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['email', 'password', 'role_id'],
              properties: {
                email: { type: 'string', format: 'email' },
                password: { type: 'string', minLength: 6 },
                username: { type: 'string' },
                country: { type: 'string' },
                role_id: { type: 'integer' },
                learn_unit_id: { type: 'string', format: 'uuid' }
              }
            }
          }
        }
      },
      responses: {
        201: {
          description: 'User created successfully',
          content: { 'application/json': { schema: { $ref: '#/components/schemas/User' } } }
        }
      }
    }
  },
  '/api/v1/admin/users/{id}': {
    patch: {
      tags: ['Admin'],
      summary: 'Update profile information for a user',
      security: [{ bearerAuth: [] }],
      parameters: [
        { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }
      ],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                username: { type: 'string' },
                email: { type: 'string', format: 'email' },
                country: { type: 'string' },
                account_status: { type: 'string' },
                role_id: { type: 'integer' },
                learn_unit_id: { type: 'string', format: 'uuid', nullable: true },
                password: { type: 'string' }
              }
            }
          }
        }
      },
      responses: {
        200: {
          description: 'User profile updated',
          content: { 'application/json': { schema: { $ref: '#/components/schemas/User' } } }
        }
      }
    },
    delete: {
      tags: ['Admin'],
      summary: 'Delete user account',
      security: [{ bearerAuth: [] }],
      parameters: [
        { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }
      ],
      responses: {
        200: { description: 'User deleted successfully' }
      }
    }
  },
  '/api/v1/admin/subject-access-requests': {
    get: {
      tags: ['Admin'],
      summary: 'List classified subject access requests',
      security: [{ bearerAuth: [] }],
      responses: {
        200: { description: 'Subject access requests list details' }
      }
    }
  },
  '/api/v1/admin/subject-access-requests/{id}': {
    patch: {
      tags: ['Admin'],
      summary: 'Approve or reject subject access request',
      security: [{ bearerAuth: [] }],
      parameters: [
        { name: 'id', in: 'path', required: true, schema: { type: 'integer' } }
      ],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['status'],
              properties: {
                status: { type: 'string', enum: ['approved', 'rejected'] }
              }
            }
          }
        }
      },
      responses: {
        200: { description: 'Access request status updated successfully' }
      }
    }
  },
  '/api/v1/admin/users/{id}/insights': {
    get: {
      tags: ['Admin'],
      summary: 'Get learning insights metadata statistics of user',
      security: [{ bearerAuth: [] }],
      parameters: [
        { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }
      ],
      responses: {
        200: { description: 'Insights dashboard details retrieved' }
      }
    }
  },
  '/api/v1/admin/stats': {
    get: {
      tags: ['Admin'],
      summary: 'Get system-wide analytics stats data',
      security: [{ bearerAuth: [] }],
      responses: {
        200: { description: 'Global analytical database metrics details' }
      }
    }
  }
};

const systemPaths = {
  '/api/v1/health': {
    get: {
      tags: ['System'],
      summary: 'Health status check',
      responses: {
        200: {
          description: 'API is functional',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  status: { type: 'string' },
                  message: { type: 'string' }
                }
              }
            }
          }
        }
      }
    }
  }
};

export const swaggerSpec = {
  openapi: '3.0.0',
  info: {
    title: 'Anhoc API Documentation',
    version: '1.0.0',
    description: 'Comprehensive API documentation for the Anhoc.'
  },
  servers: [
    {
      url: 'http://localhost:5001',
      description: 'Development Server'
    }
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT'
      }
    },
    schemas: {
      User: userSchema,
      Lesson: lessonSchema,
      Subject: subjectSchema,
      Grade: gradeSchema,
      QuestionTemplate: questionTemplateSchema,
      TestAttempt: testAttemptSchema,
      QuestionSnapshot: questionSnapshotSchema,
      Achievement: achievementSchema,
      GameChallenge: gameChallengeSchema,
      Notification: notificationSchema,
      Plan: planSchema,
      Error: errorSchema
    }
  },
  paths: {
    ...authPaths,
    ...lessonPaths,
    ...testPaths,
    ...achievementPaths,
    ...gamePaths,
    ...notificationPaths,
    ...subscriptionPaths,
    ...supervisorPaths,
    ...adminPaths,
    ...systemPaths
  }
};
