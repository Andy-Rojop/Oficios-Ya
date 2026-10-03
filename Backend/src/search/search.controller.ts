import { Controller, Get, Query } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from '../common/decorators/public.decorator';
import { SearchSuggestionsQueryDto, SearchWorkersQueryDto } from './dto/search-workers-query.dto';
import { SearchSuggestionDto, SearchWorkersResponseDto } from './dto/search-response.dto';
import { SearchService } from './search.service';

@ApiTags('search')
@Public()
@Controller('search')
export class SearchController {
  constructor(private readonly search: SearchService) {}

  @Get('workers')
  @ApiOperation({
    summary:
      'RF-029 a RF-035: busca trabajadores verificados (filtros combinados, orden, cursor). Sin datos privados.',
  })
  @ApiOkResponse({ type: SearchWorkersResponseDto })
  workers(@Query() query: SearchWorkersQueryDto): Promise<SearchWorkersResponseDto> {
    return this.search.searchWorkers(query);
  }

  @Get('suggestions')
  @ApiOperation({ summary: 'RF-036: hasta 8 sugerencias (categorías y titulares de trabajadores)' })
  @ApiOkResponse({ type: [SearchSuggestionDto] })
  suggestions(@Query() query: SearchSuggestionsQueryDto): Promise<SearchSuggestionDto[]> {
    return this.search.suggestions(query.q);
  }
}
