from tools.llm_client import call_llm

SYSTEM = """
You are a Reflection Agent.

Responsibilities:
- Analyze validator feedback
- Analyze user feedback
- Improve future generations
- Remove repetitive issues
- Improve NBA compliance
- Improve Bloom taxonomy coverage
- Make outputs measurable and practical

Return ONLY concise improvement instructions.
"""


def run(state):
    state.log(
        "ReflectionAgent",
        "start",
        "Analyzing validator feedback to guide regeneration"
    )

    validator_feedback = getattr(state, "reflection_feedback", "Validation failed.")
    
    # Extract the previous CO statements to analyze
    previous_output = ""
    if getattr(state, "cos", None):
        previous_output = "\n".join([f"- {co.statement}" for co in state.cos])

    prompt = f"""
PREVIOUS OUTPUT:
{previous_output}

VALIDATOR FEEDBACK:
{validator_feedback}

Analyze the validator feedback. Why did the previous output fail?
Provide a concise bulleted list of strict instructions for the generator to fix these specific issues on its next attempt.
"""

    response = call_llm(
        prompt=prompt,
        system=SYSTEM,
        expect_json=False
    )
    
    state.log(
        "ReflectionAgent",
        "info",
        f"Generated improvement instructions: {response}"
    )

    # Store the synthesized reflection instructions back into state
    state.reflection_feedback = response
    
    # We now explicitly trigger the generator again to regenerate based on the reflection
    from agents import co_generator
    state.log("ReflectionAgent", "info", "Re-triggering CO Generator with reflection context...")
    state = co_generator.run(state)
    
    return state