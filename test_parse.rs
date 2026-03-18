use std::fs;

#[derive(Debug)]
pub struct SkillMetadata {
    pub name: String,
    pub description: String,
}

fn parse_skill_metadata(content: &str) -> Option<SkillMetadata> {
    if !content.starts_with("---") {
        return None;
    }

    let end_pos = content[3..].find("---")?;
    let yaml_content = &content[3..end_pos + 3];

    let mut name = None;
    let mut description = None;

    for line in yaml_content.lines() {
        let line = line.trim();
        if let Some(stripped) = line.strip_prefix("name:") {
            name = Some(stripped.trim().to_string());
        } else if let Some(stripped) = line.strip_prefix("description:") {
            description = Some(stripped.trim().to_string());
        }
    }

    Some(SkillMetadata {
        name: name?,
        description: description?,
    })
}

fn main() {
    let content = fs::read_to_string("/Users/kojunho/Library/Application Support/dumo-cowork/skills/xlsx/SKILL.md").unwrap();
    match parse_skill_metadata(&content) {
        Some(md) => println!("Success: {:?}", md),
        None => println!("Failed to parse!"),
    }
}
