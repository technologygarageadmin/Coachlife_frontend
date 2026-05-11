# CoachLife — Backend Reference

All backend functions are AWS Lambda (Python), one folder per function.
Each folder contains `lambda_function.py` + `requirements.txt`.

---

## Structure

```
backend/
  <FunctionName>/
    lambda_function.py
    requirements.txt
```

---

## Lambda Functions

### Auth
| Folder | Purpose |
|---|---|
| `CL_Admin_Sign-in` | Admin login |
| `CL_Admin_Sign-Out` | Admin logout |
| `CL_Admin_Registartion` | Register a new admin |
| `Coaches_Login` | Coach login |
| `Coaches_Registration` | Coach self-registration |
| `CL_Adding_Coaches` | Admin registers a new coach |

### Players
| Folder | Purpose |
|---|---|
| `CL_Get_All_Players` | List all players |
| `CL_Add_Players` | Add a new player |
| `CL_Update_Player` | Edit player details |
| `CL_Delete_Player` | Delete a player |
| `Player_Registration` | Player self-registration |
| `Player_List` | Alternate player list endpoint |
| `Player_Update` | Alternate player update |
| `Status` | Get player status |
| `Status_Update` | Update player status |
| `Status_Active_Update` | Set player active/inactive |

### Coaches
| Folder | Purpose |
|---|---|
| `CL_View_All_Coachs` | List all coaches |
| `CL_Updating_Coaches` | Edit coach details |
| `CL_Deleting_Coaches` | Delete a coach |
| `CL_Coaches_Sign-Out` | Coach logout |
| `CL_Assigned_Player_To_Coach` | Assign player to coach |
| `CL_Update_Remove_Assigned_Player` | Remove or swap assigned player |
| `CL_View_Assigned_Player` | Get players assigned to a coach |

### Learning Pathway
| Folder | Purpose |
|---|---|
| `CL_Get_LearningPathway` | List all pathway sessions |
| `CL_Add_Master_LearningPathway` | Add a session to a pathway |
| `CL_Update_LearningPathway` | Edit a pathway session |
| `CL_Delete_LearningPathway` | Delete a pathway session |
| `CL_Rename_LearningPathway` | Rename a learning pathway |
| `Create_Learning_Pathway` | Create a new pathway |
| `Learning_Pathway_update` | Alternate pathway update |
| `Fetch_All_Pathway` | Alternate fetch all pathways |
| `Fetch Topics` | Fetch pathway topics |
| `CL_Player_Learning_Pathway_Status_View` | View player's pathway progress |

### Session Cards
| Folder | Purpose |
|---|---|
| `CL_Generate_session_card` | Generate next sequential session card for a player |
| `CL_Generate_Custom_Session_Card` | Generate a custom session card |
| `CL_Regenerate_session_card` | Regenerate an existing session card |
| `CL_View_SessionCard` | View a session card's details |
| `CL_Update_Session_Card` | Edit a session card |
| `CL_Start_Session` | Mark a session card as started |
| `CL_Complete_Session` | Submit completed session (saves ratings + feedback) |
| `CL_Updating_Session_Feedback` | Update feedback on a completed session |
| `CL_Session_Card_Feedback` | Add/update per-activity feedback |

### Points & Rewards
| Folder | Purpose |
|---|---|
| `CL_Get_Player_Points_Summary` | Get a player's total/balance points |
| `CL_View_Rewards` | List all rewards |
| `CL_Add_Rewards` | Add a reward |
| `CL_Update_Rewards` | Edit a reward |
| `CL_Delete_Rewards` | Delete a reward |
| `CL_Redeem_Points` | Redeem points for a reward |
| `CL_Get_Reedem_History` | Get redemption history (per player) |
| `CL_View_AllPlayer_Redeemhistory` | Get redemption history (all players) |
| `Redeem_Points` | Alternate redeem endpoint |

### Attendance & Batches
| Folder | Purpose |
|---|---|
| `CL_Get_Batches` | GET all batches with their player lists |
| `CL_Manage_Batch` | POST create / update / delete a batch (`action` field) |
| `CL_Get_Attendance` | POST get attendance records, optionally filtered by `batchId` |
| `CL_Mark_Attendance` | POST upsert single attendance record; bulk mode via `bulkStatus` field |

### Leaderboard & Misc
| Folder | Purpose |
|---|---|
| `Leader_Board` | Leaderboard data (all players ranked by points) |
| `Summary` | Dashboard summary stats |
| `CL_Generate_WhatsApp_Feedback` | Generate WhatsApp feedback message for a session |
| `CL_Update_Whatsapp_Feedback` | Update WhatsApp feedback |
| `Add Comments` | Add a comment |
| `Fetch Comments` | Fetch comments |
| `Delete Comments` | Delete a comment |

---

## Common Patterns

### Handler signature
```python
def lambda_handler(event, context):
    ...
    return {
        'statusCode': 200,
        'body': json.dumps(result)
    }
```

### Auth header
Frontend sends `userToken` header (not `Authorization: Bearer`).
Lambdas read it via `event['headers'].get('userToken')`.

### DB
MongoDB Atlas — connection string in Lambda environment variables.
Collections: `players`, `coaches`, `sessionCards`, `learningPathway`, `rewards`, `redeemHistory`.
