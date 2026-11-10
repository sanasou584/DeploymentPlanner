
export const swaggerDocument = {
  openapi: '3.0.3',

  info: {
    title: 'DeploymentPlanner AI API',
    version: '1.0.0',
    description:
      'Documentation REST API de DeploymentPlanner AI',
  },

  servers: [
    {
      url: 'http://localhost:4000',
      description: 'Serveur local',
    },
  ],

  tags: [
    {
      name: 'Health',
      description: 'Vérification du serveur',
    },
    {
      name: 'Authentication',
      description: 'Gestion des comptes utilisateurs',
    },
    {
      name: 'Admin - Users',
      description: 'Gestion des utilisateurs par un administrateur',
    },
    {
      name: 'Projects',
      description: 'Gestion des projets de l’utilisateur connecté',
    },
    {
      name: 'Analyses',
      description: 'Analyse du dépôt GitHub d’un projet (workflow 1)',
    },
    {
      name: 'Recommendations',
      description:
        'Recommandations issues de l’audit local (règles) ou d’un audit IA, avec décision du développeur',
    },
    {
      name: 'AI Audit',
      description: 'Lancement de l’audit IA par n8n sur une analyse terminée (workflow 1)',
    },
    {
      name: 'Internal - AI audit and recommendations',
      description:
        'Callbacks appelés par n8n. Protégés par le secret partagé (header x-internal-secret), jamais par le JWT.',
    },
    {
      name: 'Internal - Analysis workflow',
      description:
        'Callbacks appelés par n8n. Protégés par le secret partagé (header x-internal-secret), jamais par le JWT.',
    },
    {
      name: 'Profile',
      description: 'Profil et mot de passe de l’utilisateur connecté',
    },
  ],

  paths: {
    '/health': {
      get: {
        tags: ['Health'],
        summary: 'Vérifier l’état du serveur',
        description:
          'Retourne l’état opérationnel du backend.',
        responses: {
          '200': {
            description: 'Serveur opérationnel',
          },
          '503': {
            description: 'Service indisponible',
          },
        },
      },
    },

    '/api/v1/auth/register': {
      post: {
        tags: ['Authentication'],
        summary: 'Créer un compte utilisateur',
        description:
          'Inscription d’un nouveau développeur.',

        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/RegisterInput',
              },
            },
          },
        },

        responses: {
          '201': {
            description: 'Compte créé avec succès',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/RegisterResponse',
                },
              },
            },
          },

          '400': {
            description: 'Données invalides',
          },

          '409': {
            description: 'Adresse email déjà utilisée',
          },
        },
      },
    },
    
    '/api/v1/auth/login': {
  post: {
    tags: ['Authentication'],
    summary: 'Connexion email avec JWT Bearer',
    description: 'Vérifie les identifiants et retourne un accessToken JWT pour le bouton Authorize.',

    requestBody: {
      required: true,
      content: {
        'application/json': {
          schema: {
            type: 'object',
            required: ['email', 'password'],
            additionalProperties: false,
            properties: {
              email: {
                type: 'string',
                format: 'email',
                example: 'ahmed@example.com',
              },
              password: {
                type: 'string',
                format: 'password',
                example: 'Test@123456',
              },
            },
          },
        },
      },
    },

    responses: {
      '200': {
        description: 'Connexion réussie, jeton JWT émis',
        content: {
          'application/json': {
            schema: {
              $ref: '#/components/schemas/LoginResponse',
            },
          },
        },
      },
      '400': {
        description: 'Données invalides',
      },
      '401': {
        description: 'Email ou mot de passe incorrect',
      },
      '403': {
        description: 'Compte désactivé',
      },
    },
  },
    },
    
'/api/v1/auth/github': {
  get: {
    tags: ['Authentication'],
    summary: 'Connexion avec GitHub OAuth',
    description:
      'Démarre OAuth GitHub. ' +
      'Cette route doit être ouverte directement dans un navigateur. ' +
      'Ne pas utiliser Execute dans Swagger UI : ' +
      'la redirection vers GitHub peut provoquer une erreur CORS. ' +
      'Après autorisation, le callback retourne un JWT Bearer.',
    responses: {
      '302': {
        description: 'Redirection vers GitHub',
      },
    },
  },
},


'/api/v1/auth/github/callback': {
  get: {
    tags: ['Authentication'],
    summary: 'Callback GitHub OAuth',

    description:
      'Finalise GitHub OAuth pour le navigateur. En cas de succès, la réponse ' +
      'redirige vers `${FRONTEND_URL}/session#access_token=...&user_id=...` ' +
      '(le fragment est lu par le frontend). En cas de compte refusé, ' +
      'désactivé ou en conflit d\'email, la réponse redirige vers ' +
      '`/?github=<code>` (FORBIDDEN, ACCOUNT_DISABLED, CONFLICT, ' +
      'INVALID_STATE) pour que le frontend affiche son bandeau. ' +
      'Démarrer le flux via /api/v1/auth/github dans un navigateur; ' +
      'ne pas appeler manuellement le callback.',

    parameters: [
      {
        name: 'code',
        in: 'query',
        required: true,
        schema: { type: 'string' },
      },
      {
        name: 'state',
        in: 'query',
        required: true,
        schema: { type: 'string' },
      },
    ],

    responses: {
      '302': {
        description:
          'Redirection vers le frontend : session en fragment ou "?github=<code>"',
      },
    },
  },
},

'/api/v1/admin/users': {
  get: {
    tags: ['Admin - Users'],
    summary: 'Lister les utilisateurs',
    security: [{ bearerAuth: [] }],
    parameters: [
      {
        name: 'page',
        in: 'query',
        schema: { type: 'integer', minimum: 1, default: 1 },
      },
      {
        name: 'limit',
        in: 'query',
        schema: { type: 'integer', minimum: 1, maximum: 100, default: 20 },
      },
      {
        name: 'q',
        in: 'query',
        schema: { type: 'string' },
      },
      {
        name: 'role',
        in: 'query',
        schema: { type: 'string', enum: ['ADMIN', 'DEVELOPER'] },
      },
      {
        name: 'includeDeleted',
        in: 'query',
        schema: { type: 'boolean' },
      },
    ],
    responses: {
      '200': { description: 'Liste paginée des utilisateurs' },
      '401': { description: 'Non authentifié' },
      '403': { description: 'Accès administrateur requis' },
    },
  },
},

'/api/v1/admin/users/{id}': {
  get: {
    tags: ['Admin - Users'],
    summary: 'Consulter un utilisateur',
    security: [{ bearerAuth: [] }],
    parameters: [{
      name: 'id',
      in: 'path',
      required: true,
      schema: { type: 'string' },
    }],
    responses: {
      '200': { description: 'Utilisateur trouvé' },
      '401': { description: 'Non authentifié' },
      '403': { description: 'Accès interdit' },
      '404': { description: 'Utilisateur introuvable' },
    },
  },

  patch: {
    tags: ['Admin - Users'],
    summary: 'Modifier le nom d’un utilisateur',
    security: [{ bearerAuth: [] }],
    parameters: [{
      name: 'id',
      in: 'path',
      required: true,
      schema: { type: 'string' },
    }],
    requestBody: {
      required: true,
      content: {
        'application/json': {
          schema: {
            type: 'object',
            additionalProperties: false,
            required: ['name'],
            properties: {
              name: { type: 'string', minLength: 2, maxLength: 100 },
            },
          },
        },
      },
    },
    responses: {
      '200': { description: 'Utilisateur modifié' },
      '400': { description: 'Données invalides' },
      '401': { description: 'Non authentifié' },
      '403': { description: 'Accès interdit' },
      '404': { description: 'Utilisateur introuvable' },
    },
  },
},

'/api/v1/admin/users/{id}/role': {
  patch: {
    tags: ['Admin - Users'],
    summary: 'Modifier le rôle d’un utilisateur',
    security: [{ bearerAuth: [] }],
    parameters: [{
      name: 'id',
      in: 'path',
      required: true,
      schema: { type: 'string' },
    }],
    requestBody: {
      required: true,
      content: {
        'application/json': {
          schema: {
            type: 'object',
            additionalProperties: false,
            required: ['role'],
            properties: {
              role: {
                type: 'string',
                enum: ['ADMIN', 'DEVELOPER'],
              },
            },
          },
        },
      },
    },
    responses: {
      '200': { description: 'Rôle modifié' },
      '400': { description: 'Rôle invalide' },
      '401': { description: 'Non authentifié' },
      '403': { description: 'Accès interdit' },
      '404': { description: 'Utilisateur introuvable' },
    },
  },
},

'/api/v1/admin/users/{id}/deactivate': {
  post: {
    tags: ['Admin - Users'],
    summary: 'Désactiver un utilisateur',
    security: [{ bearerAuth: [] }],
    parameters: [{
      name: 'id',
      in: 'path',
      required: true,
      schema: { type: 'string' },
    }],
    responses: {
      '200': { description: 'Utilisateur désactivé' },
      '401': { description: 'Non authentifié' },
      '403': { description: 'Accès interdit' },
      '404': { description: 'Utilisateur introuvable' },
      '409': { description: 'Transition impossible' },
    },
  },
},

'/api/v1/admin/users/{id}/reactivate': {
  post: {
    tags: ['Admin - Users'],
    summary: 'Réactiver un utilisateur',
    security: [{ bearerAuth: [] }],
    parameters: [{
      name: 'id',
      in: 'path',
      required: true,
      schema: { type: 'string' },
    }],
    responses: {
      '200': { description: 'Utilisateur réactivé' },
      '401': { description: 'Non authentifié' },
      '403': { description: 'Accès interdit' },
      '404': { description: 'Utilisateur introuvable' },
      '409': { description: 'Transition impossible' },
    },
  },
},

'/api/v1/admin/users/pending': {
  get: {
    tags: ['Admin - Users'],
    summary: 'Lister les inscriptions en attente',
    security: [{ bearerAuth: [] }],
    responses: {
      '200': {
        description: 'Inscriptions en attente',
      },
      '401': {
        description: 'JWT manquant ou invalide',
      },
      '403': {
        description: 'Administrateur requis',
      },
    },
  },
},

'/api/v1/admin/users/{id}/approve': {
  post: {
    tags: ['Admin - Users'],
    summary: 'Approuver un développeur',
    security: [{ bearerAuth: [] }],
    parameters: [
      {
        name: 'id',
        in: 'path',
        required: true,
        schema: { type: 'string' },
      },
    ],
    responses: {
      '200': {
        description: 'Développeur approuvé',
      },
      '401': {
        description: 'Non authentifié',
      },
      '403': {
        description: 'Accès interdit',
      },
      '404': {
        description: 'Utilisateur introuvable',
      },
      '409': {
        description: 'Transition de statut invalide',
      },
    },
  },
},

'/api/v1/admin/users/{id}/reject': {
  post: {
    tags: ['Admin - Users'],
    summary: 'Refuser une inscription',
    security: [{ bearerAuth: [] }],
    parameters: [
      {
        name: 'id',
        in: 'path',
        required: true,
        schema: { type: 'string' },
      },
    ],
    responses: {
      '200': {
        description: 'Inscription refusée',
      },
      '401': {
        description: 'Non authentifié',
      },
      '403': {
        description: 'Accès interdit',
      },
      '404': {
        description: 'Utilisateur introuvable',
      },
      '409': {
        description: 'Transition de statut invalide',
      },
    },
  },
},

    '/api/v1/projects/{projectId}/analyses': {
      post: {
        tags: ['Analyses'],
        summary: 'Lancer l’analyse du dépôt d’un projet',
        description:
          'Crée une analyse PENDING puis déclenche le workflow n8n. Réponse immédiate 202 : ' +
          'l’analyse passe ensuite à RUNNING puis COMPLETED ou FAILED via les callbacks internes. ' +
          'Refusé si le projet n’a pas de dépôt lié (404) ou si une analyse est déjà en cours (409). ' +
          'Si n8n est injoignable ou refuse l’appel, ou si le dépôt n’est pas vérifié, ' +
          'la réponse est 422 (INVARIANT_VIOLATION).',
        security: [{ bearerAuth: [] }],
        parameters: [{ $ref: '#/components/parameters/AnalysisProjectId' }],
        responses: {
          '202': {
            description: 'Analyse créée (statut PENDING), workflow déclenché',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/AnalysisResponse' },
              },
            },
          },
          '400': { $ref: '#/components/responses/ValidationError' },
          '401': { $ref: '#/components/responses/Unauthorized' },
          '404': { $ref: '#/components/responses/NotFound' },
          '409': {
            description: 'Une analyse est déjà en cours pour ce projet',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
          '422': {
            description: 'Workflow n8n injoignable ou refus (analyse marquée FAILED), ou dépôt non vérifié',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
        },
      },

      get: {
        tags: ['Analyses'],
        summary: 'Lister les analyses d’un projet',
        security: [{ bearerAuth: [] }],
        parameters: [
          { $ref: '#/components/parameters/AnalysisProjectId' },
          {
            name: 'page',
            in: 'query',
            schema: { type: 'integer', minimum: 1, default: 1 },
          },
          {
            name: 'limit',
            in: 'query',
            schema: { type: 'integer', minimum: 1, maximum: 100, default: 20 },
          },
        ],
        responses: {
          '200': {
            description: 'Liste paginée des analyses',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/AnalysisListResponse' },
              },
            },
          },
          '400': { $ref: '#/components/responses/ValidationError' },
          '401': { $ref: '#/components/responses/Unauthorized' },
          '404': { $ref: '#/components/responses/NotFound' },
        },
      },
    },

    '/api/v1/projects/{projectId}/analyses/{analysisId}': {
      get: {
        tags: ['Analyses'],
        summary: 'Consulter une analyse',
        description:
          'Retourne le statut et le résultat. Le frontend interroge cette route (polling) tant que le statut est PENDING ou RUNNING.',
        security: [{ bearerAuth: [] }],
        parameters: [
          { $ref: '#/components/parameters/AnalysisProjectId' },
          { $ref: '#/components/parameters/AnalysisId' },
        ],
        responses: {
          '200': {
            description: 'Analyse trouvée',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/AnalysisResponse' },
              },
            },
          },
          '400': { $ref: '#/components/responses/ValidationError' },
          '401': { $ref: '#/components/responses/Unauthorized' },
          '404': { $ref: '#/components/responses/NotFound' },
        },
      },
    },

    '/api/v1/projects/{projectId}/analyses/{analysisId}/recommendations': {
      get: {
        tags: ['Recommendations'],
        summary: 'Lister les recommandations d’une analyse',
        description:
          'Ordre décroissant de création. Chaque item porte son origine (règles internes ou audit IA) et son statut décision.',
        security: [{ bearerAuth: [] }],
        parameters: [
          { $ref: '#/components/parameters/AnalysisProjectId' },
          { $ref: '#/components/parameters/AnalysisId' },
        ],
        responses: {
          '200': {
            description: 'Recommandations de l’analyse',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/RecommendationListResponse' },
              },
            },
          },
          '400': { $ref: '#/components/responses/ValidationError' },
          '401': { $ref: '#/components/responses/Unauthorized' },
          '404': { $ref: '#/components/responses/NotFound' },
        },
      },
    },

    '/api/v1/projects/{projectId}/analyses/{analysisId}/audit': {
      post: {
        tags: ['Recommendations'],
        summary: 'Exécuter l’audit local (règles) d’une analyse terminée',
        description:
          'Génère les recommandations manquantes à partir des findings de l’analyse (dédupliquées), puis les liste.',
        security: [{ bearerAuth: [] }],
        parameters: [
          { $ref: '#/components/parameters/AnalysisProjectId' },
          { $ref: '#/components/parameters/AnalysisId' },
        ],
        responses: {
          '200': {
            description: 'Audit exécuté',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/RecommendationAuditResponse' },
              },
            },
          },
          '400': { $ref: '#/components/responses/ValidationError' },
          '401': { $ref: '#/components/responses/Unauthorized' },
          '404': { $ref: '#/components/responses/NotFound' },
          '422': { description: 'L’analyse n’est pas au statut COMPLETED' },
        },
      },
    },

    '/api/v1/projects/{projectId}/analyses/{analysisId}/recommendations/{recommendationId}/accept': {
      post: {
        tags: ['Recommendations'],
        summary: 'Accepter une recommandation',
        description: 'Transition PENDING → ACCEPTED (une seule décision possible).',
        security: [{ bearerAuth: [] }],
        parameters: [
          { $ref: '#/components/parameters/AnalysisProjectId' },
          { $ref: '#/components/parameters/AnalysisId' },
          { $ref: '#/components/parameters/RecommendationId' },
        ],
        responses: {
          '200': {
            description: 'Recommandation acceptée',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/RecommendationResponse' },
              },
            },
          },
          '400': { $ref: '#/components/responses/ValidationError' },
          '401': { $ref: '#/components/responses/Unauthorized' },
          '404': { $ref: '#/components/responses/NotFound' },
          '409': { description: 'Décision déjà prise (ACCEPTED ou REJECTED)' },
        },
      },
    },

    '/api/v1/projects/{projectId}/analyses/{analysisId}/recommendations/{recommendationId}/reject': {
      post: {
        tags: ['Recommendations'],
        summary: 'Rejeter une recommandation',
        description: 'Transition PENDING → REJECTED, avec une note optionnelle.',
        security: [{ bearerAuth: [] }],
        parameters: [
          { $ref: '#/components/parameters/AnalysisProjectId' },
          { $ref: '#/components/parameters/AnalysisId' },
          { $ref: '#/components/parameters/RecommendationId' },
        ],
        requestBody: {
          required: false,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/RejectRecommendationInput' },
            },
          },
        },
        responses: {
          '200': {
            description: 'Recommandation rejetée',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/RecommendationResponse' },
              },
            },
          },
          '400': { $ref: '#/components/responses/ValidationError' },
          '401': { $ref: '#/components/responses/Unauthorized' },
          '404': { $ref: '#/components/responses/NotFound' },
          '409': { description: 'Décision déjà prise (ACCEPTED ou REJECTED)' },
        },
      },
    },

    '/api/v1/projects/{projectId}/analyses/{analysisId}/audit/ai': {
      post: {
        tags: ['AI Audit'],
        summary: 'Demander un audit IA sur une analyse terminée',
        description:
          'Déclenche le workflow n8n d’audit hybride. Une seule exécution à la fois : une demande récente (10 min) répond CONFLICT' +
          ' tant qu’elle est active (les callbacks enregistrent l’échec ou les recommandations).',
        security: [{ bearerAuth: [] }],
        parameters: [
          { $ref: '#/components/parameters/AnalysisProjectId' },
          { $ref: '#/components/parameters/AnalysisId' },
        ],
        responses: {
          '202': {
            description: 'Audit IA demandé',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/AiAuditRequested' },
              },
            },
          },
          '401': { $ref: '#/components/responses/Unauthorized' },
          '404': { $ref: '#/components/responses/NotFound' },
          '409': { description: 'Un audit IA est déjà en cours pour cette analyse' },
          '422': {
            description: 'Analyse non terminée ou workflow n8n injoignable (le déclencheur rejette la demande)',
          },
        },
      },
    },

    '/api/v1/internal/analyses/{analysisId}/start': {
      post: {
        tags: ['Internal - Analysis workflow'],
        summary: 'Callback n8n : démarrer l’analyse',
        description: 'Transition PENDING vers RUNNING. Appelé par n8n, sans corps.',
        security: [{ internalSecret: [] }],
        parameters: [{ $ref: '#/components/parameters/AnalysisId' }],
        responses: {
          '200': {
            description: 'Analyse démarrée (RUNNING)',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/AnalysisResponse' },
              },
            },
          },
          '400': { $ref: '#/components/responses/ValidationError' },
          '401': { description: 'Secret interne manquant ou invalide' },
          '404': { $ref: '#/components/responses/NotFound' },
          '409': { description: 'Transition de statut invalide' },
        },
      },
    },

    '/api/v1/internal/analyses/{analysisId}/complete': {
      post: {
        tags: ['Internal - Analysis workflow'],
        summary: 'Callback n8n : terminer l’analyse avec son résultat',
        description:
          'Transition RUNNING vers COMPLETED. Une technologie (nom + catégorie) ou un composant (nom) en double renvoie 409.',
        security: [{ internalSecret: [] }],
        parameters: [{ $ref: '#/components/parameters/AnalysisId' }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/CompleteAnalysisInput' },
            },
          },
        },
        responses: {
          '200': {
            description: 'Analyse terminée (COMPLETED)',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/AnalysisResponse' },
              },
            },
          },
          '400': { $ref: '#/components/responses/ValidationError' },
          '401': { description: 'Secret interne manquant ou invalide' },
          '404': { $ref: '#/components/responses/NotFound' },
          '409': { description: 'Transition invalide ou doublon dans le résultat' },
        },
      },
    },

    '/api/v1/internal/analyses/{analysisId}/fail': {
      post: {
        tags: ['Internal - Analysis workflow'],
        summary: 'Callback n8n : marquer l’analyse en échec',
        description: 'Transition PENDING ou RUNNING vers FAILED, avec un code et un message d’erreur.',
        security: [{ internalSecret: [] }],
        parameters: [{ $ref: '#/components/parameters/AnalysisId' }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/FailAnalysisInput' },
            },
          },
        },
        responses: {
          '200': {
            description: 'Analyse en échec (FAILED)',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/AnalysisResponse' },
              },
            },
          },
          '400': { $ref: '#/components/responses/ValidationError' },
          '401': { description: 'Secret interne manquant ou invalide' },
          '404': { $ref: '#/components/responses/NotFound' },
          '409': { description: 'Transition de statut invalide' },
        },
      },
    },

    '/api/v1/internal/analyses/{analysisId}/recommendations': {
      post: {
        tags: ['Internal - AI audit and recommendations'],
        summary: 'Callback n8n : enregistrer les recommandations de l’audit IA',
        description:
          'Les suggestions IA sont filtrées/dédupliquées; chaque item est persisté avec son origine (provider/model).',
        security: [{ internalSecret: [] }],
        parameters: [{ $ref: '#/components/parameters/AnalysisId' }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/AiRecommendationsInput' },
            },
          },
        },
        responses: {
          '200': {
            description: 'Recommandations enregistrées',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/AiRecommendationRecorded' },
              },
            },
          },
          '400': { $ref: '#/components/responses/ValidationError' },
          '401': { description: 'Secret interne manquant ou invalide' },
          '404': { $ref: '#/components/responses/NotFound' },
          '422': { description: 'L’analyse n’est pas au statut COMPLETED' },
        },
      },
    },

    '/api/v1/internal/analyses/{analysisId}/context': {
      get: {
        tags: ['Internal - AI audit and recommendations'],
        summary: 'Callback n8n : extraire le contexte d’audit IA d’une analyse',
        description:
          'Payload prêt à consommer (dépôt, branche, fichiers détectés, docker findings). Exige un audit IA actif.',
        security: [{ internalSecret: [] }],
        parameters: [{ $ref: '#/components/parameters/AnalysisId' }],
        responses: {
          '200': {
            description: 'Contexte de l’analyse',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/AiAuditContext' },
              },
            },
          },
          '400': { $ref: '#/components/responses/ValidationError' },
          '401': { description: 'Secret interne manquant ou invalide' },
          '404': { $ref: '#/components/responses/NotFound' },
          '409': { description: 'Aucun audit IA en cours pour cette analyse' },
        },
      },
    },

    '/api/v1/internal/analyses/{analysisId}/audit-fail': {
      post: {
        tags: ['Internal - AI audit and recommendations'],
        summary: 'Callback n8n : marquer l’audit IA en échec',
        description: 'Enregistre l’échec dans le journal d’audit (action AI_AUDIT_FAILED).',
        security: [{ internalSecret: [] }],
        parameters: [{ $ref: '#/components/parameters/AnalysisId' }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/FailAnalysisInput' },
            },
          },
        },
        responses: {
          '200': {
            description: 'Échec de l’audit IA enregistré',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/AiAuditFailed' },
              },
            },
          },
          '400': { $ref: '#/components/responses/ValidationError' },
          '401': { description: 'Secret interne manquant ou invalide' },
          '404': { $ref: '#/components/responses/NotFound' },
          '409': { description: 'Aucun audit IA en cours pour cette analyse' },
        },
      },
    },

    '/api/v1/profile': {
      get: {
        tags: ['Profile'],
        summary: 'Consulter mon profil',
        description: 'Retourne le profil de l’utilisateur connecté.',
        security: [{ bearerAuth: [] }],
        responses: {
          '200': {
            description: 'Profil de l’utilisateur connecté',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ProfileResponse' },
              },
            },
          },
          '401': { $ref: '#/components/responses/Unauthorized' },
          '403': { description: 'Compte désactivé ou non approuvé' },
          '404': { $ref: '#/components/responses/NotFound' },
        },
      },

      patch: {
        tags: ['Profile'],
        summary: 'Modifier mon profil',
        description: 'Modifie le nom et/ou l’image de profil (URL https). ' +
          'Envoyer avatarUrl à null supprime l’image. Au moins un champ est requis.',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/UpdateProfileInput' },
            },
          },
        },
        responses: {
          '200': {
            description: 'Profil mis à jour',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ProfileResponse' },
              },
            },
          },
          '400': { $ref: '#/components/responses/ValidationError' },
          '401': { $ref: '#/components/responses/Unauthorized' },
          '403': { description: 'Compte désactivé ou non approuvé' },
          '404': { $ref: '#/components/responses/NotFound' },
        },
      },
    },

    '/api/v1/profile/password': {
      post: {
        tags: ['Profile'],
        summary: 'Changer mon mot de passe',
        description: 'Vérifie le mot de passe actuel puis enregistre le nouveau. ' +
          'Les comptes GitHub sans mot de passe local reçoivent 403.',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ChangePasswordInput' },
            },
          },
        },
        responses: {
          '200': {
            description: 'Mot de passe modifié',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ChangePasswordResponse' },
              },
            },
          },
          '400': { $ref: '#/components/responses/ValidationError' },
          '401': { $ref: '#/components/responses/Unauthorized' },
          '403': {
            description: 'Mot de passe actuel incorrect, compte sans mot de passe local ou compte désactivé',
          },
          '404': { $ref: '#/components/responses/NotFound' },
        },
      },
    },

    '/api/v1/projects': {
      post: {
        tags: ['Projects'],
        summary: 'Créer un projet',
        description:
          'Crée un projet pour l’utilisateur connecté. Le nom doit être unique parmi ses projets actifs.',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/CreateProjectInput' },
            },
          },
        },
        responses: {
          '201': {
            description: 'Projet créé',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ProjectResponse' },
              },
            },
          },
          '400': { $ref: '#/components/responses/ValidationError' },
          '401': { $ref: '#/components/responses/Unauthorized' },
          '409': { $ref: '#/components/responses/Conflict' },
        },
      },

      get: {
        tags: ['Projects'],
        summary: 'Lister mes projets',
        description:
          'Retourne les projets de l’utilisateur connecté, du plus récent au plus ancien.',
        security: [{ bearerAuth: [] }],
        responses: {
          '200': {
            description: 'Liste des projets',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ProjectListResponse' },
              },
            },
          },
          '401': { $ref: '#/components/responses/Unauthorized' },
        },
      },
    },

    '/api/v1/projects/{id}': {
      get: {
        tags: ['Projects'],
        summary: 'Voir un projet',
        security: [{ bearerAuth: [] }],
        parameters: [{ $ref: '#/components/parameters/ProjectId' }],
        responses: {
          '200': {
            description: 'Projet trouvé',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ProjectResponse' },
              },
            },
          },
          '400': { $ref: '#/components/responses/ValidationError' },
          '401': { $ref: '#/components/responses/Unauthorized' },
          '404': { $ref: '#/components/responses/NotFound' },
        },
      },

      patch: {
        tags: ['Projects'],
        summary: 'Modifier un projet',
        description: 'Modifie le nom et/ou la description. Au moins un champ est requis.',
        security: [{ bearerAuth: [] }],
        parameters: [{ $ref: '#/components/parameters/ProjectId' }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/UpdateProjectInput' },
            },
          },
        },
        responses: {
          '200': {
            description: 'Projet mis à jour',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ProjectResponse' },
              },
            },
          },
          '400': { $ref: '#/components/responses/ValidationError' },
          '401': { $ref: '#/components/responses/Unauthorized' },
          '404': { $ref: '#/components/responses/NotFound' },
          '409': { $ref: '#/components/responses/Conflict' },
        },
      },

      delete: {
        tags: ['Projects'],
        summary: 'Supprimer un projet',
        description:
          'Suppression logique (soft delete) : le nom redevient disponible.',
        security: [{ bearerAuth: [] }],
        parameters: [{ $ref: '#/components/parameters/ProjectId' }],
        responses: {
          '200': {
            description: 'Projet supprimé',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    message: { type: 'string', example: 'Project deleted successfully' },
                  },
                },
              },
            },
          },
          '400': { $ref: '#/components/responses/ValidationError' },
          '401': { $ref: '#/components/responses/Unauthorized' },
          '404': { $ref: '#/components/responses/NotFound' },
        },
      },
    },

    '/api/v1/projects/availability': {
      get: {
        tags: ['Projects'],
        summary: 'Vérifier la disponibilité d’un nom de projet',
        description: 'Sonde case-insensitive (collation, force 2) sur le propriétaire, ' +
          'utilisée par le parcours de création avant confirmation. ' +
          'Les projets supprimés logiquement ne bloquent pas le nom. ' +
          'L’unicité réelle reste garantie par l’index unique (propriété, nom).',
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'name',
            in: 'query',
            required: true,
            schema: { type: 'string', minLength: 1, maxLength: 120 },
            description: 'Nom candidat (espaces de bord ignorés)',
          },
        ],
        responses: {
          '200': {
            description: 'Disponibilité vérifiée',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['message', 'data'],
                  properties: {
                    message: { type: 'string', example: 'Project name availability checked' },
                    data: {
                      type: 'object',
                      required: ['name', 'exists'],
                      properties: {
                        name: { type: 'string', example: 'shopflow-store' },
                        exists: { type: 'boolean', example: false },
                      },
                    },
                  },
                },
              },
            },
          },
          '400': { $ref: '#/components/responses/ValidationError' },
          '401': { $ref: '#/components/responses/Unauthorized' },
        },
      },
    },

    '/api/v1/projects/{id}/repository': {
      put: {
        tags: ['Projects'],
        summary: 'Lier un dépôt GitHub au projet',
        description: 'Enregistre le dépôt (URL + branche), puis le vérifie auprès de GitHub : ' +
          'le dépôt doit être public et la branche doit exister. ' +
          'Le résultat est stocké dans repository.isValid. ' +
          'Envoyer une erreur si le dépôt est invalide (500).',
        security: [{ bearerAuth: [] }],
        parameters: [{ $ref: '#/components/parameters/ProjectId' }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ConnectRepositoryInput' },
            },
          },
        },
        responses: {
          '200': {
            description: 'Dépôt enregistré. data.repository.isValid à false signifie dépôt ou ' +
              'branche introuvable (voir lastVerificationError).',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ProjectResponse' },
              },
            },
          },
          '400': { $ref: '#/components/responses/ValidationError' },
          '401': { $ref: '#/components/responses/Unauthorized' },
          '404': { $ref: '#/components/responses/NotFound' },
          '500': { $ref: '#/components/responses/GithubUnavailable' },
        },
      },
    },

    '/api/v1/projects/{id}/repository/verify': {
      post: {
        tags: ['Projects'],
        summary: 'Revérifier le dépôt GitHub du projet',
        description: 'Interroge de nouveau GitHub (dépôt public, branche existante) et met à jour ' +
          'repository.isValid. Sans dépôt lié, répond 404.',
        security: [{ bearerAuth: [] }],
        parameters: [{ $ref: '#/components/parameters/ProjectId' }],
        responses: {
          '200': {
            description: 'Vérification terminée',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ProjectResponse' },
              },
            },
          },
          '400': { $ref: '#/components/responses/ValidationError' },
          '401': { $ref: '#/components/responses/Unauthorized' },
          '404': { $ref: '#/components/responses/NotFound' },
          '500': { $ref: '#/components/responses/GithubUnavailable' },
        },
      },
    },

  },

  components: {
    parameters: {
      AnalysisProjectId: {
        name: 'projectId',
        in: 'path',
        required: true,
        description: 'Identifiant du projet (24 caractères hexadécimaux)',
        schema: { type: 'string', pattern: '^[0-9a-fA-F]{24}$' },
        example: '507f1f77bcf86cd799439011',
      },
      AnalysisId: {
        name: 'analysisId',
        in: 'path',
        required: true,
        description: 'Identifiant de l’analyse (24 caractères hexadécimaux)',
        schema: { type: 'string', pattern: '^[0-9a-fA-F]{24}$' },
        example: '507f1f77bcf86cd799439012',
      },
      RecommendationId: {
        name: 'recommendationId',
        in: 'path',
        required: true,
        description: 'Identifiant de la recommandation (24 caractères hexadécimaux)',
        schema: { type: 'string', pattern: '^[0-9a-fA-F]{24}$' },
        example: '507f1f77bcf86cd799439013',
      },
      ProjectId: {
        name: 'id',
        in: 'path',
        required: true,
        description: 'Identifiant du projet (24 caractères hexadécimaux)',
        schema: { type: 'string', pattern: '^[0-9a-fA-F]{24}$' },
        example: '507f1f77bcf86cd799439011',
      },
    },

    responses: {
      ValidationError: {
        description: 'Données invalides',
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/ErrorResponse' },
          },
        },
      },
      Unauthorized: {
        description: 'Non authentifié ou session expirée',
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/ErrorResponse' },
          },
        },
      },
      NotFound: {
        description: 'Ressource introuvable (ou n’appartenant pas à l’utilisateur courant)',
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/ErrorResponse' },
          },
        },
      },
      Conflict: {
        description: 'Nom de projet déjà utilisé',
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/ErrorResponse' },
          },
        },
      },
      GithubUnavailable: {
        description: 'Erreur technique côté GitHub (injoignable, quota atteint). ' +
          'Le dépôt n’est pas modifié, réessayer plus tard.',
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/ErrorResponse' },
            example: {
              error: {
                code: 'INVARIANT_VIOLATION',
                message: 'GitHub rate limit reached, try again later',
              },
            },
          },
        },
      },
    },

    schemas: {
      RegisterInput: {
        type: 'object',
        additionalProperties: false,
        required: ['name', 'email', 'password'],

        properties: {
          name: {
            type: 'string',
            minLength: 2,
            maxLength: 100,
            example: 'Ahmed Ben Ali',
          },

          email: {
            type: 'string',
            format: 'email',
            example: 'ahmed@example.com',
          },

          password: {
            type: 'string',
            format: 'password',
            minLength: 8,
            maxLength: 128,
            writeOnly: true,
            example: 'Test@123456',
          },
        },
      },

      User: {
        type: 'object',
        properties: {
          id: {
            type: 'string',
            example: '507f1f77bcf86cd799439011',
          },
          name: {
            type: 'string',
            example: 'Ahmed Ben Ali',
          },
          email: {
            type: 'string',
            format: 'email',
            example: 'ahmed@example.com',
          },
          role: {
            type: 'string',
            example: 'DEVELOPER',
          },
        },
      },

      LoginResponse: {
        type: 'object',
        required: ['message', 'data', 'accessToken', 'tokenType', 'expiresIn'],
        properties: {
          message: { type: 'string', example: 'Login successful' },
          data: { $ref: '#/components/schemas/User' },
          accessToken: {
            type: 'string',
            description: 'JWT d’accès (ne pas consigner dans les logs)',
            example: 'eyJhbGciOiJIUzI1NiJ9...',
          },
          tokenType: { type: 'string', enum: ['Bearer'] },
          expiresIn: { type: 'integer', example: 3600 },
        },
      },

      ErrorResponse: {
        type: 'object',
        properties: {
          error: {
            type: 'object',
            properties: {
              code: { type: 'string', example: 'VALIDATION_ERROR' },
              message: { type: 'string', example: 'Invalid project data' },
              details: { type: 'object' },
            },
          },
        },
      },

      CreateProjectInput: {
        type: 'object',
        additionalProperties: false,
        required: ['name'],
        properties: {
          name: { type: 'string', minLength: 1, maxLength: 120, example: 'mon-api-node' },
          description: {
            type: 'string',
            maxLength: 1000,
            example: 'API Node.js à déployer sur Kubernetes',
          },
          environment: {
            type: 'string',
            description: 'Valeur de PROJECT_ENVIRONMENTS (défaut : DEVELOPMENT)',
            example: 'DEVELOPMENT',
          },
        },
      },

      UpdateProjectInput: {
        type: 'object',
        additionalProperties: false,
        minProperties: 1,
        properties: {
          name: { type: 'string', minLength: 1, maxLength: 120, example: 'mon-api-node-v2' },
          description: { type: 'string', maxLength: 1000, example: 'Nouvelle description' },
        },
      },

      Profile: {
        type: 'object',
        properties: {
          id: { type: 'string', example: '507f1f77bcf86cd799439011' },
          name: { type: 'string', example: 'Ahmed Ben Ali' },
          email: { type: 'string', format: 'email', example: 'ahmed@example.com' },
          role: { type: 'string', example: 'DEVELOPER' },
          avatarUrl: {
            type: 'string',
            format: 'uri',
            nullable: true,
            example: 'https://cdn.example.com/avatars/ahmed.png',
          },
          lastLoginAt: { type: 'string', format: 'date-time', nullable: true },
        },
      },

      ProfileResponse: {
        type: 'object',
        properties: {
          message: { type: 'string', example: 'Profile retrieved successfully' },
          data: { $ref: '#/components/schemas/Profile' },
        },
      },

      UpdateProfileInput: {
        type: 'object',
        additionalProperties: false,
        minProperties: 1,
        properties: {
          name: { type: 'string', minLength: 2, maxLength: 100, example: 'Ahmed Ben Ali' },
          avatarUrl: {
            type: 'string',
            format: 'uri',
            nullable: true,
            maxLength: 2048,
            description: 'URL https de l’image, ou null pour la supprimer',
            example: 'https://cdn.example.com/avatars/ahmed.png',
          },
        },
      },

      ChangePasswordInput: {
        type: 'object',
        additionalProperties: false,
        required: ['currentPassword', 'newPassword'],
        properties: {
          currentPassword: {
            type: 'string',
            format: 'password',
            maxLength: 128,
            writeOnly: true,
            example: 'Test@123456',
          },
          newPassword: {
            type: 'string',
            format: 'password',
            minLength: 8,
            maxLength: 128,
            writeOnly: true,
            description: 'Doit être différent du mot de passe actuel',
            example: 'Nouveau@123456',
          },
        },
      },

      ChangePasswordResponse: {
        type: 'object',
        properties: {
          message: { type: 'string', example: 'Password changed successfully' },
          data: { type: 'object', nullable: true, example: null },
        },
      },

      ConnectRepositoryInput: {
        type: 'object',
        additionalProperties: false,
        required: ['url', 'branch'],
        properties: {
          url: {
            type: 'string',
            format: 'uri',
            maxLength: 200,
            example: 'https://github.com/octocat/Hello-World',
          },
          branch: {
            type: 'string',
            minLength: 1,
            maxLength: 255,
            pattern: '^[A-Za-z0-9._/-]+$',
            example: 'master',
          },
        },
      },

      Project: {
        type: 'object',
        properties: {
          id: { type: 'string', example: '507f1f77bcf86cd799439011' },
          owner: { type: 'string', example: '507f191e810c19729de860ea' },
          name: { type: 'string', example: 'mon-api-node' },
          description: { type: 'string', example: 'API Node.js à déployer sur Kubernetes' },
          environment: { type: 'string', example: 'DEVELOPMENT' },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
          repository: { $ref: '#/components/schemas/RepositoryRef' },
        },
      },

      RepositoryRef: {
        type: 'object',
        properties: {
          provider: { type: 'string', example: 'github' },
          owner: { type: 'string', example: 'octocat' },
          name: { type: 'string', example: 'Hello-World' },
          branch: { type: 'string', example: 'master' },
          url: {
            type: 'string',
            format: 'uri',
            description: 'Champ calculé par le modèle (virtual), jamais stocké',
            example: 'https://github.com/octocat/Hello-World',
          },
          isValid: {
            type: 'boolean',
            description: 'true seulement si GitHub confirme le dépôt public et la branche',
            example: true,
          },
          defaultBranch: { type: 'string', example: 'master' },
          lastVerifiedAt: { type: 'string', format: 'date-time' },
          lastVerificationError: { type: 'string', example: 'Branch "dev" not found' },
        },
      },

      ProjectResponse: {
        type: 'object',
        properties: {
          message: { type: 'string', example: 'Project created successfully' },
          data: { $ref: '#/components/schemas/Project' },
        },
      },

      ProjectListResponse: {
        type: 'object',
        properties: {
          message: { type: 'string', example: 'Projects retrieved successfully' },
          data: {
            type: 'array',
            items: { $ref: '#/components/schemas/Project' },
          },
        },
      },
      AnalysisTechnology: {
        type: 'object',
        required: ['name', 'category'],
        properties: {
          name: { type: 'string', example: 'FastAPI' },
          version: { type: 'string', example: '0.110.0' },
          category: {
            type: 'string',
            description: 'Valeur de TECHNOLOGY_CATEGORIES',
            example: 'framework',
          },
          sourceFile: { type: 'string', example: 'requirements.txt' },
        },
      },

      AnalysisComponent: {
        type: 'object',
        required: ['name', 'type', 'rootPath'],
        properties: {
          name: { type: 'string', example: 'backend' },
          type: {
            type: 'string',
            description: 'Valeur de ANALYZED_COMPONENT_TYPES',
            example: 'BACKEND',
          },
          rootPath: { type: 'string', example: '.' },
        },
      },

      AnalysisDockerFinding: {
        type: 'object',
        required: ['ruleId', 'severity', 'message'],
        properties: {
          ruleId: { type: 'string', example: 'DL3006' },
          severity: {
            type: 'string',
            description: 'Valeur de DOCKER_FINDING_SEVERITIES',
            example: 'WARNING',
          },
          message: { type: 'string', example: 'Always tag the version of an image explicitly' },
          file: { type: 'string', example: 'Dockerfile' },
          line: { type: 'integer', minimum: 1, example: 1 },
        },
      },

      AnalysisDocker: {
        type: 'object',
        required: ['hasDockerfile', 'hasCompose', 'findings'],
        properties: {
          hasDockerfile: { type: 'boolean', example: true },
          hasCompose: { type: 'boolean', example: false },
          findings: {
            type: 'array',
            items: { $ref: '#/components/schemas/AnalysisDockerFinding' },
          },
        },
      },

      Analysis: {
        type: 'object',
        properties: {
          id: { type: 'string', example: '507f1f77bcf86cd799439012' },
          number: { type: 'integer', minimum: 1, example: 3 },
          project: { type: 'string', example: '507f1f77bcf86cd799439011' },
          requestedBy: { type: 'string', example: '507f191e810c19729de860ea' },
          status: {
            type: 'string',
            enum: ['PENDING', 'RUNNING', 'COMPLETED', 'FAILED'],
            example: 'COMPLETED',
          },
          branch: { type: 'string', example: 'main' },
          detectedFiles: {
            type: 'array',
            items: { type: 'string' },
            example: ['requirements.txt', 'dockerfile'],
          },
          technologies: {
            type: 'array',
            items: { $ref: '#/components/schemas/AnalysisTechnology' },
          },
          components: {
            type: 'array',
            items: { $ref: '#/components/schemas/AnalysisComponent' },
          },
          docker: { $ref: '#/components/schemas/AnalysisDocker' },
          error: {
            type: 'object',
            description: 'Présent seulement si le statut est FAILED',
            properties: {
              code: { type: 'string', example: 'WORKFLOW_ERROR' },
              message: { type: 'string', example: 'GitHub request failed (404)' },
            },
          },
          startedAt: { type: 'string', format: 'date-time', nullable: true },
          finishedAt: { type: 'string', format: 'date-time', nullable: true },
          durationMs: { type: 'integer', example: 1052 },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
        },
      },

      AnalysisResponse: {
        type: 'object',
        properties: {
          message: { type: 'string', example: 'Analysis retrieved' },
          data: { $ref: '#/components/schemas/Analysis' },
        },
      },

      AnalysisListResponse: {
        type: 'object',
        properties: {
          message: { type: 'string', example: 'Analyses retrieved' },
          data: {
            type: 'array',
            items: { $ref: '#/components/schemas/Analysis' },
          },
          pagination: {
            type: 'object',
            properties: {
              page: { type: 'integer', example: 1 },
              limit: { type: 'integer', example: 20 },
              total: { type: 'integer', example: 3 },
              pageCount: { type: 'integer', example: 1 },
            },
          },
        },
      },

      CompleteAnalysisInput: {
        type: 'object',
        properties: {
          detectedFiles: {
            type: 'array',
            items: { type: 'string' },
            example: ['requirements.txt', 'dockerfile'],
          },
          technologies: {
            type: 'array',
            items: { $ref: '#/components/schemas/AnalysisTechnology' },
            example: [],
          },
          components: {
            type: 'array',
            items: { $ref: '#/components/schemas/AnalysisComponent' },
            example: [],
          },
          docker: { $ref: '#/components/schemas/AnalysisDocker' },
        },
      },

      FailAnalysisInput: {
        type: 'object',
        required: ['code', 'message'],
        properties: {
          code: { type: 'string', example: 'WORKFLOW_ERROR' },
          message: { type: 'string', example: 'Reset during n8n setup' },
        },
      },

      Recommendation: {
        type: 'object',
        properties: {
          id: { type: 'string', example: '507f1f77bcf86cd799439013' },
          analysisId: { type: 'string', example: '507f1f77bcf86cd799439012' },
          generatedBy: {
            type: 'object',
            properties: {
              provider: { type: 'string', example: 'internal' },
              model: { type: 'string', example: 'audit-rules-v1' },
            },
          },
          type: {
            type: 'string',
            enum: ['REPLICAS', 'CPU', 'MEMORY', 'HPA', 'INGRESS', 'DOCKER', 'SECURITY', 'GENERAL'],
            example: 'SECURITY',
          },
          severity: { type: 'string', enum: ['INFO', 'WARNING', 'CRITICAL'], example: 'WARNING' },
          title: { type: 'string', example: 'Plaintext secret (docker-compose.yml:3)' },
          description: { type: 'string' },
          componentName: { type: 'string', example: 'graph-container' },
          suggestedValue: { type: 'string' },
          confidence: { type: 'number', minimum: 0, maximum: 1 },
          proposedFile: {
            type: 'object',
            properties: {
              path: { type: 'string', example: 'deploy/secrets.env' },
              content: { type: 'string' },
            },
          },
          status: { type: 'string', enum: ['PENDING', 'ACCEPTED', 'REJECTED'], example: 'PENDING' },
          decisionNote: { type: 'string' },
          createdAt: { type: 'string', format: 'date-time' },
        },
      },

      RecommendationListResponse: {
        type: 'object',
        properties: {
          message: { type: 'string', example: 'Recommendations retrieved' },
          data: {
            type: 'array',
            items: { $ref: '#/components/schemas/Recommendation' },
          },
        },
      },

      RecommendationAuditResponse: {
        type: 'object',
        properties: {
          message: { type: 'string', example: 'Audit completed' },
          data: {
            type: 'object',
            properties: {
              created: { type: 'integer', example: 1 },
              recommendations: {
                type: 'array',
                items: { $ref: '#/components/schemas/Recommendation' },
              },
            },
          },
        },
      },

      RecommendationResponse: {
        type: 'object',
        properties: {
          message: { type: 'string', example: 'Recommendation accepted' },
          data: { $ref: '#/components/schemas/Recommendation' },
        },
      },

      RejectRecommendationInput: {
        type: 'object',
        properties: {
          note: { type: 'string', maxLength: 1000, example: 'Not our deployment target' },
        },
      },

      AiAuditRequested: {
        type: 'object',
        properties: {
          message: { type: 'string', example: 'AI audit requested' },
          data: {
            type: 'object',
            properties: {
              analysisId: { type: 'string', example: '507f1f77bcf86cd799439012' },
              status: { type: 'string', example: 'REQUESTED' },
            },
          },
        },
      },

      AiAuditFailed: {
        type: 'object',
        properties: {
          message: { type: 'string', example: 'AI audit failure recorded' },
          data: {
            type: 'object',
            properties: {
              analysisId: { type: 'string', example: '507f1f77bcf86cd799439012' },
              status: { type: 'string', example: 'FAILED' },
            },
          },
        },
      },

      AiRecommendationInputItem: {
        type: 'object',
        required: ['type', 'severity', 'title', 'description'],
        properties: {
          type: {
            type: 'string',
            enum: ['REPLICAS', 'CPU', 'MEMORY', 'HPA', 'INGRESS', 'DOCKER', 'SECURITY', 'GENERAL'],
          },
          severity: { type: 'string', enum: ['INFO', 'WARNING', 'CRITICAL'] },
          title: { type: 'string', maxLength: 200 },
          description: { type: 'string', maxLength: 2000 },
          componentName: { type: 'string', maxLength: 200 },
          suggestedValue: { type: 'string', maxLength: 4000 },
          confidence: { type: 'number', minimum: 0, maximum: 1 },
          proposedFile: {
            type: 'object',
            required: ['path', 'content'],
            properties: {
              path: { type: 'string', maxLength: 300, example: 'deploy/secrets.env' },
              content: { type: 'string', maxLength: 20000 },
            },
          },
        },
      },

      AiRecommendationsInput: {
        type: 'object',
        required: ['provider', 'model', 'recommendations'],
        properties: {
          provider: { type: 'string', maxLength: 100, example: 'openai' },
          model: { type: 'string', maxLength: 100, example: 'gpt-4o' },
          recommendations: {
            type: 'array',
            maxItems: 50,
            items: { $ref: '#/components/schemas/AiRecommendationInputItem' },
          },
        },
      },

      AiRecommendationRecorded: {
        type: 'object',
        properties: {
          message: { type: 'string', example: 'Recommendations recorded' },
          data: {
            type: 'object',
            properties: {
              created: { type: 'integer', example: 3 },
              skipped: { type: 'integer', example: 1 },
            },
          },
        },
      },

      AiAuditContext: {
        type: 'object',
        properties: {
          message: { type: 'string', example: 'AI audit context retrieved' },
          data: {
            type: 'object',
            properties: {
              analysisId: { type: 'string', example: '507f1f77bcf86cd799439012' },
              repository: {
                type: 'object',
                properties: {
                  owner: { type: 'string', example: 'acme' },
                  name: { type: 'string', example: 'repo' },
                },
              },
              branch: { type: 'string', example: 'main' },
              detectedFiles: { type: 'array', items: { type: 'string' } },
              technologies: { type: 'array', items: { type: 'object' } },
              components: { type: 'array', items: { type: 'object' } },
              docker: { $ref: '#/components/schemas/AnalysisDocker' },
            },
          },
        },
      },

      RegisterResponse: {
        type: 'object',
        properties: {
          message: {
            type: 'string',
            example: 'User registered successfully',
          },
          data: {
            $ref: '#/components/schemas/User',
          },
        },
      },

    },
    securitySchemes: {
    internalSecret: {
      type: 'apiKey',
      in: 'header',
      name: 'x-internal-secret',
      description:
        'Secret partagé avec n8n (valeur de N8N_SHARED_SECRET dans backend/.env). ' +
        'Réservé aux routes /api/v1/internal/*.',
    },
    bearerAuth: {
      type: 'http',
      scheme: 'bearer',
      bearerFormat: 'JWT',
      description:
        'JWT applicatif obtenu après une connexion par email/mot de passe ' +
        'ou GitHub OAuth. Coller seulement accessToken dans Authorize, ' +
        'sans le préfixe Bearer.',
    },
  },
  },
} as const;
