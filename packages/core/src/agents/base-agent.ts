/**
 * Base GOAP Agent Implementation
 * Provides core Goal-Oriented Action Planning functionality with A* pathfinding
 */

import { EventEmitter } from 'events';
import type {
  WorldState,
  Goal,
  Action,
  ActionContext,
  ActionResult,
  ActionPlan,
  GOAPPlanningError
} from '../types/index.js';
import { Logger } from '../utils/logger.js';
import { performanceMonitor } from '../utils/performance.js';

export abstract class BaseAgent extends EventEmitter {
  protected worldState: WorldState;
  protected goals: Goal[] = [];
  protected actions: Action[] = [];
  protected readonly logger: Logger;
  protected readonly maxPlanningTime = 5000; // 5 seconds
  protected readonly maxPlanLength = 20;

  constructor(
    initialState: WorldState,
    protected readonly agentName: string
  ) {
    super();
    this.worldState = { ...initialState };
    this.logger = new Logger(`Agent:${agentName}`);
    this.setupErrorHandling();
  }

  /**
   * Execute a task by finding and executing an action plan
   */
  @performanceMonitor('agent_execution')
  async execute(task: { goal: string; context: any }): Promise<any> {
    const startTime = Date.now();
    
    try {
      this.emit('task:started', { 
        task, 
        agent: this.agentName,
        timestamp: new Date()
      });
      
      const goal = this.goals.find(g => g.name === task.goal);
      if (!goal) {
        throw new GOAPPlanningError(
          `Goal '${task.goal}' not found in agent '${this.agentName}'`,
          { id: '', name: task.goal, priority: 0, conditions: {} },
          this.worldState
        );
      }

      const plan = await this.planActions(goal);
      if (plan.actions.length === 0) {
        throw new GOAPPlanningError(
          `No valid action plan found for goal '${task.goal}'`,
          goal,
          this.worldState
        );
      }

      let result = task.context;
      const actionResults: ActionResult[] = [];

      // Execute actions sequentially
      for (const [index, action] of plan.actions.entries()) {
        this.emit('action:started', { 
          action: action.name, 
          step: index + 1, 
          total: plan.actions.length 
        });

        const actionContext: ActionContext = {
          worldState: this.worldState,
          goal,
          metadata: { stepIndex: index, previousResults: actionResults }
        };

        const actionResult = await this.executeAction(action, actionContext);
        actionResults.push(actionResult);

        if (!actionResult.success) {
          throw new Error(
            `Action '${action.name}' failed: ${actionResult.error?.message}`
          );
        }

        // Update world state with action effects
        this.updateWorldState(actionResult.newState || action.effects);
        result = actionResult.data || result;

        this.emit('action:completed', {
          action: action.name,
          duration: actionResult.duration,
          step: index + 1
        });
      }

      const totalDuration = Date.now() - startTime;
      this.emit('task:completed', { 
        task, 
        result, 
        duration: totalDuration,
        actionsExecuted: plan.actions.length
      });

      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      this.logger.error('Task execution failed', {
        task,
        error: error.message,
        duration,
        worldState: this.worldState
      });
      
      this.emit('task:failed', { task, error, duration });
      throw error;
    }
  }

  /**
   * Plan actions using A* algorithm to achieve the goal
   */
  protected async planActions(goal: Goal): Promise<ActionPlan> {
    const startTime = Date.now();
    
    try {
      // A* algorithm implementation
      const openList: Array<{
        state: WorldState;
        actions: Action[];
        cost: number;
        heuristic: number;
      }> = [
        {
          state: this.worldState,
          actions: [],
          cost: 0,
          heuristic: this.calculateHeuristic(this.worldState, goal)
        }
      ];
      
      const closedSet = new Set<string>();
      const timeout = setTimeout(() => {
        throw new GOAPPlanningError(
          `Planning timeout after ${this.maxPlanningTime}ms`,
          goal,
          this.worldState
        );
      }, this.maxPlanningTime);

      try {
        while (openList.length > 0) {
          // Sort by f-cost (cost + heuristic)
          openList.sort((a, b) => (a.cost + a.heuristic) - (b.cost + b.heuristic));
          const current = openList.shift()!;

          // Check if goal is satisfied
          if (this.goalSatisfied(goal, current.state)) {
            const plan: ActionPlan = {
              id: `plan_${Date.now()}`,
              goal,
              actions: current.actions,
              estimatedCost: current.cost,
              estimatedDuration: current.actions.reduce(
                (sum, action) => sum + (action.timeout || 1000), 
                0
              ),
              createdAt: new Date()
            };
            
            this.logger.info('Action plan created', {
              goalName: goal.name,
              actionCount: plan.actions.length,
              estimatedCost: plan.estimatedCost,
              planningTime: Date.now() - startTime
            });
            
            return plan;
          }

          // Prevent infinite loops
          if (current.actions.length >= this.maxPlanLength) {
            continue;
          }

          const stateKey = this.getStateKey(current.state);
          if (closedSet.has(stateKey)) continue;
          closedSet.add(stateKey);

          // Explore possible actions
          for (const action of this.actions) {
            if (this.preconditionsMet(action, current.state)) {
              const newState = this.applyEffects(current.state, action.effects);
              const newCost = current.cost + action.cost;
              const heuristic = this.calculateHeuristic(newState, goal);

              openList.push({
                state: newState,
                actions: [...current.actions, action],
                cost: newCost,
                heuristic
              });
            }
          }
        }
      } finally {
        clearTimeout(timeout);
      }

      // No plan found
      throw new GOAPPlanningError(
        `No valid plan found for goal '${goal.name}'`,
        goal,
        this.worldState
      );
    } catch (error) {
      this.logger.error('Action planning failed', {
        goalName: goal.name,
        error: error.message,
        planningTime: Date.now() - startTime
      });
      throw error;
    }
  }

  /**
   * Execute a single action with error handling and timeout
   */
  protected async executeAction(
    action: Action,
    context: ActionContext
  ): Promise<ActionResult> {
    const startTime = Date.now();
    
    try {
      const timeoutMs = action.timeout || 30000; // 30 second default
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(
          () => reject(new Error(`Action timeout after ${timeoutMs}ms`)),
          timeoutMs
        );
      });

      const result = await Promise.race([
        action.execute(context),
        timeoutPromise
      ]);

      return {
        success: true,
        data: result,
        duration: Date.now() - startTime
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error : new Error(String(error)),
        duration: Date.now() - startTime
      };
    }
  }

  /**
   * Check if goal conditions are satisfied by current state
   */
  protected goalSatisfied(goal: Goal, state: WorldState): boolean {
    return Object.entries(goal.conditions).every(([key, expectedValue]) => {
      const actualValue = state[key];
      
      if (typeof expectedValue === 'function') {
        return expectedValue(state);
      }
      
      return actualValue === expectedValue;
    });
  }

  /**
   * Check if action preconditions are met
   */
  protected preconditionsMet(action: Action, state: WorldState): boolean {
    return Object.entries(action.preconditions).every(([key, expectedValue]) => {
      const actualValue = state[key];
      return actualValue === expectedValue;
    });
  }

  /**
   * Apply action effects to world state
   */
  protected applyEffects(
    state: WorldState,
    effects: Partial<WorldState>
  ): WorldState {
    return { ...state, ...effects };
  }

  /**
   * Update current world state
   */
  protected updateWorldState(newState: Partial<WorldState>): void {
    const previousState = { ...this.worldState };
    this.worldState = { ...this.worldState, ...newState };
    
    this.emit('state:updated', {
      previous: previousState,
      current: this.worldState,
      changes: newState
    });
  }

  /**
   * Calculate heuristic for A* algorithm
   */
  protected calculateHeuristic(state: WorldState, goal: Goal): number {
    let distance = 0;
    
    for (const [key, expectedValue] of Object.entries(goal.conditions)) {
      if (typeof expectedValue === 'function') {
        // For function conditions, assume satisfied if true
        if (!expectedValue(state)) distance += 1;
      } else if (state[key] !== expectedValue) {
        distance += 1;
      }
    }
    
    return distance;
  }

  /**
   * Generate unique key for world state (for closed set in A*)
   */
  protected getStateKey(state: WorldState): string {
    const sortedEntries = Object.entries(state)
      .filter(([_, value]) => typeof value !== 'function')
      .sort(([a], [b]) => a.localeCompare(b));
    return JSON.stringify(sortedEntries);
  }

  /**
   * Setup error handling for uncaught errors
   */
  protected setupErrorHandling(): void {
    this.on('error', (error) => {
      this.logger.error('Uncaught agent error', {
        error: error.message,
        stack: error.stack
      });
    });
  }

  /**
   * Get current world state (readonly)
   */
  getWorldState(): Readonly<WorldState> {
    return Object.freeze({ ...this.worldState });
  }

  /**
   * Get available goals (readonly)
   */
  getGoals(): ReadonlyArray<Goal> {
    return Object.freeze([...this.goals]);
  }

  /**
   * Get available actions (readonly)
   */
  getActions(): ReadonlyArray<Action> {
    return Object.freeze([...this.actions]);
  }
}
