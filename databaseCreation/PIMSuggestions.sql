SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[PIMSuggestions](
	[id] [uniqueidentifier] NOT NULL,
	[displayName] [varchar](120) NOT NULL,
	[PrincipalName] [varchar](120) NOT NULL,
	[InUse] [bit] NOT NULL,
	[lastUsed] [datetime] NULL,
	[GroupName] [varchar](256) NULL,
	[GroupDescription] [varchar](1024) NULL,
	[RoleDisplayName] [varchar](256) NOT NULL,
	[DirectoryScopeId] [varchar](max) NOT NULL,
	[AccountType] [varchar](120) NOT NULL,
	[AssignmentType] [varchar](120) NOT NULL,
	[AccountId] [uniqueidentifier] NOT NULL,
	[GroupId] [uniqueidentifier] NULL,
	[RoleId] [uniqueidentifier] NOT NULL,
	[reportId] [uniqueidentifier] NOT NULL
) ON [PRIMARY] TEXTIMAGE_ON [PRIMARY]
GO
ALTER TABLE [dbo].[PIMSuggestions] ADD  CONSTRAINT [PK_PIMSuggestions] PRIMARY KEY CLUSTERED 
(
	[id] ASC
)WITH (STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ONLINE = OFF, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
GO
ALTER TABLE [dbo].[PIMSuggestions] ADD  CONSTRAINT [DEFAULT_PIMSuggestions_id]  DEFAULT (newid()) FOR [id]
GO
